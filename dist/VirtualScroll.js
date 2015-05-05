(function (angular) {
    "use strict";

    var directives = angular.module('net.enzey.virtual-scroll', []);

    directives.directive('nzVs', ['$parse', '$window', '$document', '$timeout', function ($parse, $window, $document, $timeout) {
        return {
			priority: 9000,
			compile: function ($element, $attrs) {
				if (!angular.isDefined($attrs.ngRepeat)) {throw "'nz-vs' directive requires 'ng-repeat' to be defined on the same element!"}

				var ngRepeatScopeVar = / in (.+?)(?: |$)/.exec($attrs.ngRepeat)[1];
				var vsArrayName = 'vs' + ngRepeatScopeVar[0].toUpperCase() + ngRepeatScopeVar.slice(1);
				$attrs.ngRepeat = $attrs.ngRepeat.replace(" in " + ngRepeatScopeVar, ' in ' + vsArrayName);
				//$element.attr($attrs.$attr.ngRepeat, $attrs.ngRepeat.replace(" in " + ngRepeatScopeVar, ' in ' + vsArrayName));

				var preSpacer = angular.element('<' + $element[0].tagName + '></' + $element[0].tagName + '>');
				var postSpacer = preSpacer.clone();

				$element[0].parentElement.insertBefore(preSpacer[0], $element[0])
				$element.after(postSpacer);

				var tableSeperateBorderOffset = 0;
				var findScrollElem = function(elem) {
					if (!elem || elem === $document[0]) {throw 'could not find a parent element with scrolling overflow!';}

					var compStyles = $window.getComputedStyle(elem);
					if (elem.tagName.toLowerCase() === 'table' && compStyles.getPropertyValue('border-collapse') !== 'collapse') {
						tableSeperateBorderOffset = 2;
					}
					var overflowVal = compStyles.getPropertyValue('overflow-y');
					if (overflowVal === 'scroll' || overflowVal === 'auto') {
						return elem;
					} else{
						return findScrollElem(elem.parentElement);
					}
				};
				var buffer = 2;
				var elemSize;
				var scrollElement = findScrollElem($element[0].parentElement);
				var getVisibleRows = function(newArray, size) {
					var height = scrollElement.clientHeight;

					var preElementCount = Math.floor(scrollElement.scrollTop / elemSize);
					var preElementCount = Math.max(0, preElementCount - buffer);
					var maxVisibleRows = Math.ceil(height / size) + (2 * buffer);

					var rowStripingOffset = preElementCount % 2;
					preElementCount -= rowStripingOffset;
					maxVisibleRows += rowStripingOffset;

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
							if (newArray && newArray[0]) {
								if (!elemSize) {
									$parse(vsArrayName).assign(scope, [newArray[0]]);
									$timeout(function() {
										var singleRow = element[0].parentElement.children[1];
										var rowHeight = singleRow.getBoundingClientRect().height;
										elemSize = rowHeight + tableSeperateBorderOffset;

										$parse(vsArrayName).assign(scope, getVisibleRows(newArray, elemSize));
									}, 0, true);
								} else {
									$parse(vsArrayName).assign(scope, getVisibleRows(newArray, elemSize));
								}
							}
						});
					},
					post:  function (scope, element, attrs) {
						var updateVisible;
						angular.element(scrollElement).on('scroll', function() {
							$timeout.cancel(updateVisible);
							updateVisible = $timeout(function() {
								$parse(vsArrayName).assign(scope, getVisibleRows($parse(ngRepeatScopeVar)(scope), elemSize));
							} , 20);
						});
					}
				}
			}
        };
    }]);

})(angular);
