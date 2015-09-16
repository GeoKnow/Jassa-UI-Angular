
var rdfTermInputCounter = 0;

angular.module('ui.jassa.rdf-term-input', [])

/**
 * @ngdoc directive
 * @name ui.jassa.rdf-term-input.directive:rdfTermInput
 * @element rdf-term-input
 * @function
 * @restrict EA
 *
 * @description
 * This directives creates an input field for
 * editing plain-, typed-, uri-literals. The user can switch
 * instantly between them.
 *
 * @example
 <doc:example module="ui.jassa.rdf-term-input" animations="true">
 <doc:source>
 </doc:source>
 </doc:example>
 */
.directive('rdfTermInput', ['$parse', function($parse) {

    // Some vocab - later we could fetch labels on-demand based on the uris.
    var vocab = {
        iri: 'http://iri',
        plainLiteral: 'http://plainLiteral',
        typedLiteral: 'http://typedLiteral'
    };

    return {
        restrict: 'EA',
        priority: 0,
        //transclude: true,
        //require: ['?^ngForm', 'ngModel'],
        require: 'ngModel',
        templateUrl: 'template/rdf-term-input/rdf-term-input.html',
        replace: true,
        //scope: true,
        scope: {
            //ngModel: '=',
            bindModel: '=ngModel',
            ngModelOptions: '=?',
            logo: '@?',
            langs: '=?', // suggestions of available languages
            datatypes: '=?', // suggestions of available datatypes
            rightButton: '=?'
        },
        controller: ['$scope', function($scope) {

            // The sub widgets will register themselves here
            $scope.forms = {};

            $scope.state = $scope.$state || {};
            $scope.ngModelOptions = $scope.ngModelOptions || {};

            this.setRightButton = function() {
              $scope.rightButton = true;
            };

            $scope.vocab = vocab;

            $scope.termTypes = [
                {id: vocab.iri, displayLabel: 'IRI'},
                {id: vocab.plainLiteral, displayLabel: 'plain'},
                {id: vocab.typedLiteral, displayLabel: 'typed'}
            ];

            var langs = [
                {id: '', displayLabel: '(none)'},
                {id: 'en', displayLabel: 'en'},
                {id: 'de', displayLabel: 'de'},
                {id: 'fr', displayLabel: 'fr'},
                {id: 'zh', displayLabel: 'zh'},
                {id: 'ja', displayLabel: 'ja'}
            ];

//            setModelAttr: function(attr, val) {
//                ngModel.$modelValue[attr] = val;
//                $scope.apply();
//            };

            /*
            $scope.termTypes = [vocab.iri, vocab.plainLiteral, vocab.typedLiteral];

            $scope.termTypeLabels = {};
            $scope.termTypeLabels[vocab.iri] = 'IRI';
            $scope.termTypeLabels[vocab.plainLiteral] = 'plain';
            $scope.termTypeLabels[vocab.typedLiteral] = 'typed';
            */


            $scope.langs = $scope.langs || langs;

            var keys = Object.keys(jassa.vocab.xsd);
            $scope.datatypes = keys.map(function(key) {

                var id = jassa.vocab.xsd[key].getUri();
                return {
                    id: id,
                    displayLabel: jassa.util.UriUtils.extractLabel(id)
                };
            });

            $scope.addLanguage = function(newLanguageValue) {
              return {
                id: newLanguageValue,
                displayLabel: newLanguageValue
              };
            };

            $scope.addDatatype = function(newDatatypeValue) {
              return {
                id: newDatatypeValue,
                displayLabel: newDatatypeValue
              };
            };

        }],
        compile: function(ele, attrs) {
            return {
                //pre: function(scope, ele, attrs, ctrls) {//ngModel) {
//                var ngForm = ctrls[0];
//                var ngModel = ctrls[1];
//
//                if(ngForm) {
//                    console.log(ngForm.$name);
//                }

                pre: function(scope, ele, attrs, ngModel) {

                    ngModel.$name = scope.$eval(attrs.name);

                    // This pristine watching seems like an aweful hack to me :/
                    // But oh well

                    var getSubForms = function() {
                        var r = [
                            scope.forms.type.value,
                            scope.forms.datatype.value,
                            scope.forms.lang.value,
                            scope.forms.value.value
                        ];

                        return r;
                    };

                    var checkPristine = function() {
                        var cs = getSubForms();

                        var r = !cs.some(function(c) {
                            return !c.$pristine;
                        });

                        return r;
                    };

                    scope.$watch(function() {
                        return ngModel.$pristine;
                    }, function(isPristine) {
                        if(isPristine) {
                            var cs = getSubForms();
                            cs.forEach(function(c) {
                                c.$setPristine();
                            });
                        }
                    });

                    scope.$watch(checkPristine, function(isPristine) {
                        if(isPristine) {
                            ngModel.$setPristine();
                        } else {
                            ngModel.$setDirty();
                        }
                    });

//                    scope.$watch('forms.type.value.$pristine', function() {
//                        console.log('YAAAY type' + scope.forms.type.value.$pristine);
//                    });
//
//                    scope.$watch('forms.value.value.$pristine', function() {
//                        console.log('Wooo value' + scope.forms.value.value.$pristine);
//                    });

                    //ngModel.$name = scope.$eval(attrs.name);

                    /*
                    console.log(scope.state);
                    scope.$watch(function() {
                        return ngModel.$pristine;
                    }, function(pristine) {

                    });
                    */


                    scope.rightButton = false;



                    scope.setRightButton = function() {
                      scope.rightButton = true;
                    };

                    var getValidState = function() {
                        var result;

                        var state = scope.state;
                        // {"type":{"id":"http://typedLiteral","displayLabel":"typed"},"value":"297.6","datatype":"http://dbpedia.org/datatype/squareKilometre"}
                        var type = state.type;

                        // If there is a value for a non-type field, set the type to plain literal
                        // Otherwise, we would 'forget' these values, as nodes without a type cannot exist and are therefore not created
                        if(type == null && !(state.value == null && state.datatype == null && state.lang == null)) {
                            type = vocab.plainLiteral;
                        }


                        switch(type) {
                        case vocab.iri:
                            result = {
                                type: 'uri',
                                value: state.value
                            };
                            break;
                        case vocab.plainLiteral:
                            result = {
                                type: 'literal',
                                value: state.value,
                                lang: state.lang,
                                datatype: ''
                            };
                            break;
                        case vocab.typedLiteral:
                            result = {
                                type: 'literal',
                                value: state.value,
                                datatype: state.datatype || jassa.vocab.xsd.xstring.getUri()
                            };
                            break;
                        default:
                            result = {};
//                            result = {
//                                type: 'uri',
//                                value: state.value
//                            };
                            break;
                        }

                        return result;
                    };

                    var convertToState = function(talisJson) {
                        // IMPORTANT: We cannot apply defaults here on the value taken from the model,
                        // because otherwise
                        // we would expose the state based on the defaults, which could
                        // in turn update the model again and modify its value
                        // Put differently: The model must not be changed unless there is user interaction
                        // with this widget!

                        //var clone = createTalisJsonObjectWithDefaults(talisJson);
                        var clone = talisJson;

//                        if(clone.type != null && clone.value == null) {
//                            clone.value = '';
//                        }

                        var node;
                        try {
                            node = jassa.rdf.NodeFactory.createFromTalisRdfJson(clone);
                        } catch(err) {
                            // Ignore invalid model values, and just wait for them to become valid
                            //console.log(err);
                        }


                        var result;
                        if(!node) {
                            result = {};
                        } else if(node.isUri()) {
                            result = {
                                type: vocab.iri,
                                value: node.getUri()
                            };
                        } else if(node.isLiteral()) {
                            var dt = node.getLiteralDatatypeUri();
                            var hasDatatype = !jassa.util.ObjectUtils.isEmptyString(dt);

                            if(hasDatatype) {
                                result = {
                                    type: vocab.typedLiteral,
                                    value: node.getLiteralLexicalForm(),
                                    datatype: dt
                                };
                            } else {
                                result = {
                                    type: vocab.plainLiteral,
                                    value: node.getLiteralLexicalForm(),
                                    lang: node.getLiteralLanguage()
                                };
                            }
                        }

                        return result;
                    };

                    scope.$watch(function () {
                        var r = scope.bindModel;
                        return r;
                    }, function(talisJson) {
                        //console.log('Got outside change: ', talisJson);

                      if (!talisJson) {
                      } else {
                          var newState = convertToState(talisJson);

  //                            var newState;
  //                            try {
  //                                newState = convertToState(talisJson);
  //                            } catch(err) {
  //                                newState = {};
  //                            }

                          scope.state = newState;

                          // init value of ui-select-box termtype
                          for (var i in scope.termTypes) {
                            if (scope.termTypes[i].id === scope.state.type) {
                              scope.termTypes.selected = scope.termTypes[i];
                              break;
                            }
                          }

                          // init value of ui-select-box datatype
                          var matchedDatatype = false;
                          for (var j in scope.datatypes) {
                            if (scope.datatypes[j].id === scope.state.datatype) {
                              scope.datatypes.selected = scope.datatypes[j];
                              matchedDatatype = true;
                              break;
                            }
                          }

                          // if the datatype is not in hashmap add them
                          if (!matchedDatatype) {
                            //TODO: short uri for displayLabel
                            var prefixMapping = new jassa.rdf.PrefixMappingImpl();
                            // create new datatype set
                            var newDatatype = {
                              id: scope.state.datatype,
                              displayLabel:  prefixMapping.shortForm(scope.state.datatype)
                            };
                            // add new datatype to datatypes
                            scope.datatypes.push(newDatatype);
                            // set datatype as selected
                            scope.datatypes.selected = newDatatype;
                          }

                          // init value of ui-select-box languages
                          var matchedLang = false;
                          for (var k in scope.langs) {
                            if (scope.langs[k].id === scope.state.lang) {
                              scope.langs.selected = scope.langs[k];
                              matchedLang = true;
                              break;
                            }
                          }

                          // if the language is not in hashmap add them
                          if (!matchedLang) {
                            // create new datatype set
                            var newLang = {
                              id: scope.state.lang,
                              displayLabel: scope.state.lang
                            };
                            // add new language to langs
                            scope.langs.push(newLang);
                            // set datatype as selected
                            scope.langs.selected = newLang;
                          }

                        //console.log('ABSORBED', newState, ' from ', talisJson);
                      }
                    }, true);

                    //if(modelSetter) {

                        scope.$watch(function () {
                            var r = getValidState();
                            return r;
                        }, function(newValue) {
                            if(newValue) {
                                //modelSetter(scope, newValue);
                                //scope.bindModel = newValue;

                                angular.copy(newValue, scope.bindModel);
                                //ngModel.$setViewValue(newValue);

                                //if(!scope.$phase) { scope.$apply(); }
                                //console.log('EXPOSED', scope.bindModel);
                            }
                        }, true);


//                        scope.$watch('state', function(state) {
//                            ngModel.$setViewValue(state);
//                        });

                    //}
                }


                // Code below worked with scope:true - but we want an isolated one
                    /*
                    var modelExprStr = attrs['ngModel'];
                    var modelGetter = $parse(modelExprStr);
                    var modelSetter = modelGetter.assign;

                    //console.log('Sigh', modelExprStr, modelGetter(scope));

                    scope.$watch(function () {
                        var r = modelGetter(scope);
                        return r;
                    }, function(talisJson) {
                        //console.log('Got outside change: ', talisJson);

                        if(talisJson) {
                            var newState = convertToState(talisJson);
                            scope.state = newState;
                            //console.log('ABSORBED', newState, ' from ', talisJson);
                        }
                    }, true);

                    if(modelSetter) {

                        scope.$watch(function () {
                            var r = getValidState();
                            return r;
                        }, function(newValue) {
                            if(newValue) {
                                modelSetter(scope, newValue);
                                //console.log('EXPOSED', newValue);
                            }
                        }, true);
                    }
                }
                */
            };
        }
    };
}]);


