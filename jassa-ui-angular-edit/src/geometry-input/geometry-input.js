angular.module('ui.jassa.geometry-input', [])

  .directive('geometryInput', ['$http', function($http) {

    var uniqueId = 1;

    return {
      restrict: 'EA',
      priority: 4,
      require: ['^ngModel'],
      templateUrl: 'template/geometry-input/geometry-input.html',
      replace: true,
      scope: {
        bindModel: '=ngModel',
        ngModelOptions: '=?'
      },
      controller: ['$scope', function($scope) {
        $scope.ngModelOptions = $scope.ngModelOptions || {};
        $scope.geometry = 'point';
        $scope.getGeocodingInformation = function(searchString, successCallback) {

          var url = 'http://nominatim.openstreetmap.org/search/?q='+searchString+'&format=json&polygon_text=1';

          var responsePromise = $http({
            'method': 'GET',
            'url': url,
            'cache': true,
            'headers' : {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          responsePromise.success(function(data, status, headers, config) {
            if(angular.isFunction(successCallback)) {
              successCallback(data, responsePromise);
            }

          });
          responsePromise.error(function(data, status, headers, config) {
            alert('AJAX failed!');
          });
        };

        $scope.fetchResults = function(searchString) {
          var url = 'http://nominatim.openstreetmap.org/search/?q='+searchString+'&format=json&polygon_text=1';
          return $http({
            'method': 'GET',
            'url': url,
            'cache': true,
            'headers' : {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }).then(function(response) {
            console.log('response', response);
            var results = [];
            for (var i in response.data) {
              if (response.data[i].hasOwnProperty('geotext')) {
                results.push({
                  'wkt': response.data[i].geotext,
                  'label': response.data[i].display_name
                });
              }
            }
            console.log('results', results);
            return results;
          });
        };

        $scope.onSelectGeocode = function(item) {
          console.log('onselect', item);
          $scope.bindModel = item.wkt;
        };
      }],
      compile: function(ele, attrs) {
        return {
          pre: function (scope, ele, attrs) {
            scope.searchString = '';



            var map, drawControls, polygonLayer, panel, wkt, vectors;

            scope.$watch(function () {
              return scope.bindModel;
            }, function (newValue, oldValue) {
              //console.log('old value of input', oldValue);
              // clear layer
              vectors.destroyFeatures();
              // set config data with changed input value ...
              scope.bindModel = newValue;
              // ... then call parseWKT to redraw the feature
              if (scope.bindModel != null) {
                parseWKT();
              }
            });

            scope.$watch(function () {
              return scope.geometry;
            }, function (newValue) {
              //console.log('radio', scope.geometry-input-input);
              //scope.geometry-input-input = newValue;
              toggleControl();
            });

            scope.$watch(function () {
              return scope.searchString;
            }, function (newValue) {
              console.log('searchString', newValue);
              if (newValue.length > 3) {
                scope.getGeocodingInformation(newValue, function(data) {
                  console.log('getGeocodingInformation', data);
                  for (var i in data) {
                    if(data[i].geotext != null) {
                      parseWKT(data[i].geotext);
                    }

                  }
                });
              }
              //scope.searchResults = scope.fetchGeocodingResults(newValue);
            });

            function init() {
              // generate custom map id
              var mapId = 'openlayers-map-' + uniqueId++;
              // set custom map id
              ele.find('.map').attr('id', mapId);
              // init openlayers map with custom map id
              map = new OpenLayers.Map(mapId);

              var wmsLayer = new OpenLayers.Layer.WMS('OpenLayers WMS',
                'http://vmap0.tiles.osgeo.org/wms/vmap0?', {layers: 'basic'});

              panel = new OpenLayers.Control.Panel({'displayClass': 'olControlEditingToolbar'});

              var snapVertex = {methods: ['vertex', 'edge'], layers: [vectors]};

              // allow testing of specific renderers via "?renderer=Canvas", etc
              var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
              renderer = (renderer) ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;

              vectors = new OpenLayers.Layer.Vector('Vector Layer', {
                renderers: renderer
              });

              map.addLayers([wmsLayer, vectors]);
              map.addControl(new OpenLayers.Control.LayerSwitcher());
              map.addControl(new OpenLayers.Control.MousePosition());

              vectors.events.on({
                sketchcomplete: GeometryWasDrawn
              });

              wkt = new OpenLayers.Format.WKT();

              drawControls = {
                point: new OpenLayers.Control.DrawFeature(vectors,
                  OpenLayers.Handler.Point, {
                    displayClass: 'olControlDrawFeaturePoint',
                    handlerOptions: snapVertex}),
                line: new OpenLayers.Control.DrawFeature(vectors,
                  OpenLayers.Handler.Path, {
                    displayClass: 'olControlDrawFeaturePath',
                    handlerOptions: snapVertex}),
                polygon: new OpenLayers.Control.DrawFeature(vectors,
                  OpenLayers.Handler.Polygon, {
                    displayClass: 'olControlDrawFeaturePolygon',
                    handlerOptions: snapVertex}),
                box: new OpenLayers.Control.DrawFeature(vectors,
                  OpenLayers.Handler.RegularPolygon, {
                    displayClass: 'olControlDrawFeatureBox',
                    handlerOptions: _.extend({
                      sides: 4,
                      irregular: true
                    }, snapVertex)
                  }),
                modify: new OpenLayers.Control.ModifyFeature(vectors, {
                  snappingOptions: snapVertex,
                  onModificationStart: onModificationStart,
                  onModification: onModification,
                  onModificationEnd: onModificationEnd
                })
              };

              panel.addControls(drawControls['modify']);
              map.addControl(panel);
              panel.activateControl(drawControls.modify);

              for (var key in drawControls) {
                map.addControl(drawControls[key]);
              }

              map.setCenter(new OpenLayers.LonLat(0, 0), 4);
            }

            function GeometryWasDrawn(drawnGeometry) {
              /*var ft = polygonLayer.features;
              for(var i=0; i< ft.length; i++){
                console.log(polygonLayer.features[i].geometry-input-input.getBounds());
                displayWKT(polygonLayer.features[i]);
              }*/
              var wktValue = generateWKT(drawnGeometry.feature);
              scope.bindModel = wktValue;
              scope.$apply();
            }

            function generateWKT(feature) {
              var str = wkt.write(feature);
              str = str.replace(/,/g, ', ');
              return str;
            }

            function parseWKT(pWktString) {
              var wktString = pWktString || scope.bindModel;
              //console.log('parseWKT', scope.bindModel);
              var features = wkt.read(wktString);
              var bounds;
              if (features) {
                if (features.constructor != Array) {
                  features = [features];
                }
                for (var i = 0; i < features.length; ++i) {
                  if (!bounds) {
                    bounds = features[i].geometry.getBounds();
                  } else {
                    bounds.extend(features[i].geometry.getBounds());
                  }

                }
                vectors.addFeatures(features);
                map.zoomToExtent(bounds);
                var plural = (features.length > 1) ? 's' : '';
                //console.log('Added WKT-String. Feature' + plural + ' added');
              } else {
                console.log('Bad WKT');
              }
            }

            function toggleControl() {
              //console.log('toggleControl', scope.geometry-input-input);
              var control = drawControls[scope.geometry];
              for (var key in drawControls) {
                control = drawControls[key];
                if (scope.geometry == key) {
                  control.activate();
                } else {
                  control.deactivate();
                }
              }
            }

            function onModificationStart(feature) {
              //console.log(feature.id + ' is ready to be modified');
              drawControls[scope.geometry].deactivate();

            }

            function onModification(feature) {
              //console.log(feature.id + ' has been modified');
              var wktValue = generateWKT(feature);
              scope.bindModel = wktValue;
              scope.$apply();
            }

            function onModificationEnd(feature) {
              //console.log(feature.id + ' is finished to be modified');
              drawControls[scope.geometry].activate();
            }

            // init openlayers
            init();

            // set geometry-input-input
            var control = drawControls[scope.geometry];
            control.activate();
          }
        };
      }
    };
  }]);