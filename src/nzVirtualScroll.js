(function (angular, $) {
    "use strict";

	var eventNameReportSize = 'VirtualScrollReportElementSize';
    var directives = angular.module('net.enzey.virtual-scroll', []);

    directives.directive('nzVsReportSize', function ($timeout) {
        return {
			link: function (scope, element, attrs) {
				$timeout(function() {
					scope.$emit(eventNameReportSize, {index: scope.$index, element: element});
				});
			}
		};
	});

    directives.directive('nzVs', function ($parse, $document, $timeout) {
        return {
			priority: 999999,
			compile: function ($element, $attrs) {
				var ngRepeatScopeVar = / in (.+?)(?: |$)/.exec($attrs.ngRepeat)[1];
				var vsArrayName = 'vs' + ngRepeatScopeVar[0].toUpperCase() + ngRepeatScopeVar.slice(1);
				$attrs.ngRepeat = $attrs.ngRepeat.replace(" in " + ngRepeatScopeVar, ' in ' + vsArrayName);
				//$element.attr($attrs.$attr.ngRepeat, $attrs.ngRepeat.replace(" in " + ngRepeatScopeVar, ' in ' + vsArrayName));
				$element.attr('nz-vs-report-size', '');
				var isAvgSizeNeeded = angular.isDefined($attrs.nzVsSizeAveraging);
				var elementSizes = [];

				var preSpacer = angular.element('<' + $element[0].tagName + '></' + $element[0].tagName + '>');
				preSpacer.css('color', 'transparent');
				preSpacer.css('background-color', 'transparent');
				var postSpacer = preSpacer.clone();

				$($element).before(preSpacer);
				$element.after(postSpacer);

				var tableSeperateBorderOffset = 0;
				var findScrollElem = function(elem) {
					if (!elem[0] || elem[0] === $document[0]) {throw 'could not find a parent element with scrolling overflow!';}

					// jqLite ONLY returns inline styles, thus jQuery is needed
					elem = $(elem);
					if (elem[0].tagName.toLowerCase() === 'table' && elem.css('border-collapse') !== 'collapse') {
						tableSeperateBorderOffset = 2;
					}
					var overflowVal = elem.css('overflow-y');
					if (overflowVal === 'scroll' || overflowVal === 'auto') {
						return elem;
					} else{
						return findScrollElem(elem.parent());
					}
				};
				var buffer = 2;
				var elemSize;
				var preElementCount;
				var postElementCount;
				var scrollElement = findScrollElem($element.parent());
				var getVisibleRows = function(newArray, size) {
					var height = scrollElement[0].clientHeight;

					preElementCount = Math.floor(scrollElement[0].scrollTop / elemSize);
					preElementCount = Math.max(0, preElementCount - buffer);
					var maxVisibleRows = Math.ceil(height / size) + (2 * buffer);

					var rowStripingOffset = preElementCount % 2;
					preElementCount -= rowStripingOffset;
					maxVisibleRows += rowStripingOffset;

					var avalVisibleRows = Math.min(maxVisibleRows, newArray.length);

					postElementCount = Math.max(0, newArray.length - avalVisibleRows - preElementCount);

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
						scope.$on(eventNameReportSize, function(event, data) {
							if (isAvgSizeNeeded) {
								var rowHeight = $(data.element).height();
								elementSizes[preElementCount + data.index] = rowHeight;

								var i = elementSizes.length;
								var total = 0;
								var skippedCount = 0;
								while (i--) {
									if (elementSizes[i]) {
										total += elementSizes[i];
									} else {
										skippedCount += 1;
									}
								}
								var newAverage = elemSize = total / (elementSizes.length - skippedCount);
								if (elemSize !== newAverage) {
									elemSize = newAverage;
									postSpacer.css('height', postElementCount * elemSize);
									preSpacer.css('height', preElementCount * elemSize);
								}

							} else {
								elemSize = $(data.element).height();
							}
						});

						scope.$watchCollection(ngRepeatScopeVar, function(newArray, oldArray) {
							elementSizes.length = newArray.length;
							if (!elemSize) {
								$parse(vsArrayName).assign(scope, [newArray[0]]);
								$timeout(function() {
									var singleRow = $(element.parent().children()[1]);
									elemSize = singleRow.height() + tableSeperateBorderOffset;

									$parse(vsArrayName).assign(scope, getVisibleRows(newArray, elemSize));
								}, 0, true);
							} else {
								$parse(vsArrayName).assign(scope, getVisibleRows(newArray, elemSize));
							}
						});
					},
					post:  function (scope, element, attrs) {
						var lastScrollTop = 0;
						var updateVisible;
						scrollElement.on('scroll', function() {
							$timeout.cancel(updateVisible);
							updateVisible = $timeout(function() {
								var newScrollTop = scrollElement[0].scrollTop;
								var isScrolledUp = false;
								if (newScrollTop < lastScrollTop) {
									isScrolledUp = true;
								}

								var edgeElem;
								if (isScrolledUp) {
									edgeElem = preSpacer.next();
								} else {
									edgeElem = angular.element($(postSpacer).prev());
								}

								var startingScrollOffset = edgeElem[0].offsetTop;
								//var startingPreBufferHeight = preElementCount * elemSize;
								var startingIndex = edgeElem.scope().$index;

								$parse(vsArrayName).assign(scope, getVisibleRows($parse(ngRepeatScopeVar)(scope), elemSize));

								lastScrollTop = newScrollTop;
								$timeout(function() {
									if (edgeElem.parent().length === 1) {
										// Edge element is still visible
										var endingScrollOffset = edgeElem[0].offsetTop;
										var endingIndex = edgeElem.scope().$index;
										if (endingIndex !== startingIndex) {}
										if (startingScrollOffset !== endingScrollOffset) {
											// Edge element is not in the same position after
											//   the displayed objects changed.
										}
									}
								}, 0, false);
							} , 20);
						});
					}
				}
			}
        };
    });

})(angular, jQuery);
