//TODO Move to some better place
Jassa.setOlMapCenter = function(map, config) {
    var zoom = config.zoom;

    var center = config.center;
    var olCenter = null;
    if(center && center.lon != null && center.lat != null) {
        var lonlat = new OpenLayers.LonLat(center.lon, center.lat);
        olCenter = lonlat.clone().transform(map.displayProjection, map.projection);
    }

    if(olCenter != null) {
        map.setCenter(olCenter, zoom);
    }
    else if(zoom != null) {
        map.setZoom(zoom);
    }
};



angular.module('ui.jassa.openlayers.jassa-map-ol', [])

.controller('JassaMapOlCtrl', ['$scope', '$q', function($scope, $q) {

    $scope.loadingSources = [];
    
    $scope.items = [];

    
    /**
     * Checks whether the item is a box or a generic object
     */
    var addItem = function(item) {
        var mapWrapper = $scope.map.widget;

        if(item.zoomClusterBounds) {
            mapWrapper.addBox(item.id, item.zoomClusterBounds);
        }
        else {
            var wktNode = item.wkt;
            var wkt = wktNode.getLiteralLexicalForm();

            mapWrapper.addWkt(item.id, wkt, item);// {fillColor: markerFillColor, strokeColor: markerStrokeColor});
        }
    };
    
    $scope.$watchCollection('items', function(after, before) {
        var mapWrapper = $scope.map.widget;
        mapWrapper.clearItems();

        _($scope.items).each(function(item) {
            addItem(item);
        });
    });
    
    
    //$scope.boxes = [];
    var fetchDataFromSourceCore = function(dataSource, bounds) {
        
        var p = dataSource.fetchData(bounds);
        
        var result = p.pipe(function(items) {

            items = _(items).compact();

            // Commented out because this is the application's decision 
            // Add the dataSource as the config
//            _(items).each(function(item) {
//                item.config = dataSource;
//            });

            return items;
        });
        
        return result;
    };
    
    var fetchDataFromSource = function(dataSourceId, dataSource, bounds) {
        // Check if we are already loading from this data source
        var idToState = _($scope.loadingSources).indexBy('id');
        
        var state = idToState[dataSourceId];
        
        // If there is a prior state, cancel it
        if(state) {
            if(state.promise.abort) {
                state.promise.abort();
            }
        } else {
            state = {
                id: dataSourceId,
                requestId: 0
            };

            idToState[dataSourceId] = state;
            $scope.loadingSources.push(state);
        }
        
        var requestId = ++state.requestId;
        
        var promise = fetchDataFromSourceCore(dataSource, bounds);
        
        var result = promise.pipe(function(items) {
            if(idToState[dataSourceId].requestId != requestId) {
                return;
            }

            items = _(items).compact(true);
            
            
            jassa.util.ArrayUtils.removeByGrep($scope.loadingSources, function(item) {
                return item.id === dataSourceId;
            });
            
            jassa.util.ArrayUtils.addAll($scope.items, items);

            if(!$scope.$$phase && !$scope.$root.$$phase) {
                $scope.$apply();
            }
            
            return items;
        });

        
        state.promise = result;
        
        return result;
    };
    
        
    var fetchData = function(dataSources, bounds, progressionCallback) {

        var promises = [];
        //for(var i = 0; i < dataSources.length; ++i) {
        _(dataSources).each(function(dataSource, i) {
            var promise = fetchDataFromSource('' + i, dataSource, bounds);
            promises.push(promise);
        });
        
        //var promises = _(dataSources).map(function(dataSource) {
        //    fetchDataFromSource
        //});
        
        var result = jQuery.when.apply(window, promises).pipe(function() {
            var r = _(arguments).flatten(true);
            return r;
        });

        return result;
    };

    var refresh = function() {
        
        jassa.util.ArrayUtils.clear($scope.items);

        var dataSources = $scope.sources;
        var bounds = jassa.geo.openlayers.MapUtils.getExtent($scope.map);

        var promise = fetchData(dataSources, bounds);

        // Nothing to to with the promise as the scope has already been updated
//        jassa.sponate.angular.bridgePromise(promise, $q.defer(), $scope, function(items) {
//            $scope.items = items;
//        });
    };
    
    
    // Make Jassa's ObjectUtils known to the scope - features the hashCode utility function
    $scope.ObjectUtils = jassa.util.ObjectUtils;
    
    $scope.$watch('config', function(config, oldConfig) {
        if(_(config).isEqual(oldConfig)) {
            return;
        }
        
        Jassa.setOlMapCenter($scope.map, config);
    }, true);
    

    $scope.$watch('[map.center, map.zoom]', function() {
        //console.log('Map refresh: ' + jassa.util.ObjectUtils.hashCode($scope.config));
        refresh();
    }, true);
    
    
//    $scope.$watch('sources', function() {
//        refresh();
//    });
    $scope.$watchCollection('sources', function() {
        refresh();
    });

    
}])

//http://jsfiddle.net/A2G3D/1/
.directive('jassaMapOl', ['$compile', function($compile) {
    return {
        restrict: 'EA',
        replace: true,
        template: '<div></div>',
        controller: 'JassaMapOlCtrl',
        scope: {
            config: '=',
            sources: '=',
            onSelect: '&select',
            onUnselect: '&unselect'
        },
        link: function (scope, element, attrs) {
            
            var $el = jQuery(element).ssbMap();
            var widget = $el.data('custom-ssbMap');

            var map = widget.map;
            map.widget = widget;
            
            scope.map = map;

            Jassa.setOlMapCenter(scope.map, scope.config);

            // Status Div
            //<ul><li ng-repeat="item in loadingSources">{{item.id}}</li></ul>
            var statusDivHtml = '<span ng-show="loadingSources.length > 0" class="label label-primary" style="position: absolute; right: 10px; bottom: 25px; z-index: 1000;">Waiting for data from <span class="badge">{{loadingSources.length}}</span> sources... </span>';
            
            var $elStatus = $compile(statusDivHtml)(scope);
            element.append($elStatus);
            
            /*
            var $;
            if (!$) {$ = angular.element; }
            var $statusDiv = $('<div>');
            $statusDiv.css({
                position: 'absolute',
                right: 10,
                bottom: 10,
                'z-index': 1000
            });
            var $statusContent = $('<span>YAAAY</span>');
            
            $statusDiv.append($statusContent);
            
            element.append($statusDiv);
*/
            
            // Status Div
            
            var syncModel = function(event) {
                var tmp = scope.map.getCenter();
                var center = tmp.transform(scope.map.projection, scope.map.displayProjection);
                
                //console.log('syncModel', center);

                scope.config.center = {lon: center.lon, lat: center.lat};
                scope.config.zoom = scope.map.getZoom();
                if(!scope.$root.$$phase) {
                    scope.$apply();
                }
            };

            
            $el.on('ssbmapfeatureselect', function(ev, data) {
                scope.onSelect({data: data});
            });

            $el.on('ssbmapfeatureunselect', function(ev, data) {
                scope.onUnselect({data: data});
            });
                    
            
            map.events.register('moveend', this, syncModel);
            map.events.register('zoomend', this, syncModel);
        }
            
    };
}])

;

