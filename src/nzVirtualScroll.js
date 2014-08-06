(function (angular, $) {
    "use strict";

    var directives = angular.module('net.enzey.virtual-scroll', []);

    directives.directive('nzVs', function ($parse, $document, $timeout) {
        return {
			priority: 999999,
			compile: function ($element, $attrs) {
				var ngRepeatScopeVar = / in (.+?)\b/.exec($attrs.ngRepeat)[1];
				var vsArrayName = 'vs' + ngRepeatScopeVar[0].toUpperCase() + ngRepeatScopeVar.slice(1);
				$attrs.ngRepeat = $attrs.ngRepeat.replace(" in " + ngRepeatScopeVar, ' in ' + vsArrayName);
				//$element.attr($attrs.$attr.ngRepeat, $attrs.ngRepeat.replace(" in " + ngRepeatScopeVar, ' in ' + vsArrayName));

				var preSpacer = angular.element('<' + $element[0].tagName + '></' + $element[0].tagName + '>');
				var postSpacer = preSpacer.clone();

				$element.parent().prepend(preSpacer);
				$element.parent().append(postSpacer);

				var findScrollElem = function(elem) {
					if (!elem[0] || elem[0] === $document[0]) {throw 'could not find a parent element with scrolling overflow!';}

					// jqLite ONLY returns inline styles, thus jQuery is needed
					elem = $(elem);
					var overflowVal = elem.css('overflow-y');
					if (overflowVal === 'scroll' || overflowVal === 'auto') {
						return elem;
					} else{
						return findScrollElem(elem.parent());
					}
				};
				var buffer = 2;
				var elemSize;
				var scrollElement = findScrollElem($element.parent());
				var getVisibleRows = function(newArray, size) {
					var height = scrollElement[0].clientHeight;

					var preElementCount = Math.floor(scrollElement[0].scrollTop / elemSize);
					var preElementCount = Math.max(0, preElementCount - buffer);

					var maxVisibleRows = 1 + Math.ceil(height / size) + (buffer * 2);
					var avalVisibleRows = Math.min(maxVisibleRows, newArray.length);

					var postElementCount = Math.max(0, newArray.length - avalVisibleRows - preElementCount);

					var lowerEndBufferOffset = 0;
					if (postElementCount <= buffer) {
						lowerEndBufferOffset = buffer - postElementCount;
						preElementCount = Math.max(0, newArray.length - avalVisibleRows - buffer);
					}
					postSpacer.css('height', postElementCount * elemSize);
					preSpacer.css('height', preElementCount * elemSize);

					var visible = [];
					for (var i = preElementCount; i < preElementCount + avalVisibleRows + lowerEndBufferOffset; i++) {
						visible.push(newArray[i]);
					}

					return visible;
				};

				return {
					pre: function (scope, element, attrs) {
						if (angular.isDefined($attrs.nzVsBuffer)) {
							var userBuffer = +$parse($attrs.nzVsBuffer)(scope);
							if (!isNaN(userBuffer)) {
								buffer = Math.max(0, userBuffer);
							}
						}
						scope.$watchCollection(ngRepeatScopeVar, function(newArray, oldArray) {
							if (!elemSize) {
								$parse(vsArrayName).assign(scope, [newArray[0]]);
								$timeout(function() {
									var singleRow = $(element.parent().children()[1]);
									elemSize = singleRow.height() +2;

									$parse(vsArrayName).assign(scope, getVisibleRows(newArray, elemSize));
								}, 0, true);
							} else {
								$parse(vsArrayName).assign(scope, getVisibleRows(newArray, elemSize));
							}
						});
					},
					post:  function (scope, element, attrs) {
						var updateVisible;
						scrollElement.on('scroll', function() {
							$timeout.cancel(updateVisible);
							updateVisible = $timeout(function() {
								$parse(vsArrayName).assign(scope, getVisibleRows($parse(ngRepeatScopeVar)(scope), elemSize));
							} , 20);
						});
					}
				}
			}
        };
    });

})(angular, jQuery);
