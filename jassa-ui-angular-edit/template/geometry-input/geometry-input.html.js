angular.module("template/geometry-input/geometry-input.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/geometry-input/geometry-input.html",
    "<div class=\"geometry-input\" style=\"height:375px;\">\n" +
    "  <div>\n" +
    "    <input type=\"radio\" value=\"point\" name=\"geometry\" ng-model=\"geometry\" /><label>Point</label>\n" +
    "    <input type=\"radio\" value=\"line\" name=\"geometry\" ng-model=\"geometry\" /><label>Line</label>\n" +
    "    <input type=\"radio\" value=\"polygon\" name=\"geometry\" ng-model=\"geometry\" /><label>Polygon</label>\n" +
    "    <input type=\"radio\" value=\"box\" name=\"geometry\" ng-model=\"geometry\" /><label>Box</label>\n" +
    "  </div>\n" +
    "  <!--input ng-model=\"searchString\" class=\"form-control\" type=\"text\" placeholder=\"Search for a place\"/-->\n" +
    "  <div class=\"ui icon input loading\" style=\"width: 100%;\">\n" +
    "    <input ng-model=\"searchString\"\n" +
    "           placeholder=\"Search for a place (typeahead)\"\n" +
    "           typeahead-min-length=\"3\"\n" +
    "           typeahead-wait-ms=\"100\"\n" +
    "           typeahead-loading=\"isLoading\"\n" +
    "           typeahead-template-url=\"template/geometry-input/geometry-input-typeahead.html\"\n" +
    "           typeahead-min-length typeahead-on-select=\"onSelectGeocode($item)\"\n" +
    "           typeahead=\"item.label as item.label for item in fetchResults($viewValue)\"\n" +
    "           class=\"form-control\" />\n" +
    "    <i ng-if=\"isLoading\" class=\"search icon\"></i>\n" +
    "  </div>\n" +
    "  <div class=\"map\" style=\"width: 100%; height: 300px;\"></div>\n" +
    "</div>");
}]);
