var app = angular.module("myShoppingList", ['angularjsdb']);

app.directive('focusMe', function($timeout) {
    return {
        scope: {
            focusMeIf: "="
        },
        link: function(scope, element, attrs) {
            if (scope.focusMeIf === undefined || scope.focusMeIf) {
                $timeout(function() {
                    element[0].focus();
                });
            }
        }
    };
});

app.directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if (event.which === 13) {
                scope.$apply(function() {
                    scope.$eval(attrs.ngEnter, {
                        'event': event
                    });
                });
                event.preventDefault();
            }
        });
    };
});

app.controller("myCtrl", function($scope, $http, angularjsdb, $window, $filter) {
    function customAutofocus($timeout) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                $timeout(function() {
                    element[0].focus();
                }, 0);
            }
        };
    }

    function keyEnter($document) {
        return {
            restrict: "A",
            scope: false,
            link: function(scope, ele, attrs) {
                ele.bind("keydown keypress", function(event) {
                    if (event.which === 13) {
                        scope.$apply(function() {
                            scope.$eval(attrs.keyEnter);
                        });
                        event.preventDefault();
                    }
                });
            }
        }
    }

    var linkUrl = '../data/clearance.json';
    $scope.itemList = [];
    $scope.paymethod = "";
    $scope.date = new Date();

    $scope.showModal = false;
    $scope.modal = false;
    $scope.modalEditor = false;
    $scope.click = function() {
        return $scope.modal = true;
    };
    $scope.hide = function() {
        return $scope.modal = false;
    };
    $scope.hideNew = function() {
        return $scope.modalEditor = false;
    };
    $scope.currentID = Math.random().toString(36).substr(2, 6);

    var db = angularjsdb({
        name: 'wc_indexeddb',
        version: 1,
        stores: ['store']
    });
    // get local indexeddb data
    db.list('store').then(function(data) {
        $scope.orderList = data;
        console.log("local cache database : ", $scope.orderList);
    });

    $http({
        method: 'GET',
        url: linkUrl
    }).then(function successCallback(data) {
        $scope.products = data.data['Sheet1'];
    });

    $scope.addSku = function() {
        $scope.hasOrder = false;
        $scope.none = false;
        $scope.noPayment = false;
        $scope.hasItem = true;
        let checkNone = $scope.products.some(function(e) {
            return e['Sku'] === $scope.addMe;
        });
        if ($scope.addMe && $scope.addMe != '' && checkNone) {

            $scope.item = {
                brand: ' ',
                sku: ' ',
                price: ' ',
                num: ' '
            };
            // check sku exists or not in original list 
            $scope.none = false;

            let skuIndexProducts = $scope.products.findIndex(element => element['Sku'] == $scope.addMe);
            let element = $scope.products[skuIndexProducts];
            $scope.item.sku = element.Sku;
            $scope.item.price = element.RMB;

            // check brand 
            if (element.Brand === "其他") {
                $scope.item.brand = "其他";
            } else {
                $scope.item.brand = "Enjoy";
            }

            // check sku qty in order
            let checkNum = $scope.itemList.some(function(ele) {
                return ele['sku'] === $scope.addMe;
            });

            if (checkNum) {
                $scope.itemList.forEach(eleme => {
                    if (eleme['sku'] == $scope.addMe) {
                        console.log(eleme.index);
                        eleme['num']++;
                        $scope.item.num = eleme['num']++;
                        $scope.itemList.splice(eleme.index, 1);
                    }
                });
            } else {
                $scope.item.num = 1;
            }

            $scope.itemList.push($scope.item);
            $scope.hasOrder = true;
        } else {
            console.log("输入的SKU不正确");
            $scope.none = true;
        }

        $scope.addMe = '';
        document.getElementById("inputSku").focus();
    };

    // 购物车商品总价
    $scope.subTotal = function() {
        $scope.currentCost = 0;
        $scope.itemList.forEach(function(item) {
            $scope.currentCost += item.num * parseInt(item.price);
        });
        return $scope.currentCost;
    };

    $scope.removeItem = function(index) {
        $scope.itemList.splice(index, 1);
        if (!$scope.itemList.length) {
            $scope.hasOrder = false;
        }
    };

    $scope.saveOrder = function(paymethod) {
        $scope.order = {
            orderId: '',
            cost: '',
            pay: '',
            skulist: [],
            created_at: ''
        };

        if (paymethod !== "") {
            $scope.order.orderId = $scope.currentID;
            $scope.order.cost = $scope.currentCost;
            $scope.order.pay = $scope.paymethod;
            $scope.order.created_at = parseInt($filter('date')(new Date(), 'HHmmssdd'));
            $scope.itemList.forEach(eleme => {
                $scope.order.skulist.push(eleme)
            });
            db.add('store', $scope.order).then(function(result) {
                console.log("DB add orderID:", result);
                $scope.orderList.push($scope.order);
            }).then(function() {
                $scope.addMe = '';
                $scope.paymethod = "";
                document.getElementById("inputSku").focus();
                $scope.currentID = Math.random().toString(36).substr(2, 6);
                $scope.currentCost = 0;
                $scope.itemList = [];
                $scope.hasItem = false;
                $scope.noPayment = false;
                $scope.hasOrder = false;
            });
            console.log($scope.orderList);
        } else {
            $scope.noPayment = true;
        }
    };

    function remove(item) {
        db.delete('store', item.id).then(function() {
            var index = $scope.orderList.indexOf(item);
            $scope.orderList.splice(index, 1);
        });
    }

    $scope.deleteDB = function() {
        console.log("delete DB");
        $scope.modal = false;
        db.list('store').then(function(orders) {
            orders.forEach(e => {
                remove(e);
            })
        });
    };

    $scope.removeOrder = function(order) {
        console.log("delete Order");
        remove(order);
    };

    $scope.editOrder = function(order) {
        $scope.newOrder = order;
        return $scope.modalEditor = true;
    };

    $scope.orderTotal = function(changeOrder) {
        if ($scope.modalEditor === true) {
            changeOrder.cost = 0;
            changeOrder.skulist.forEach((sku) => {
                changeOrder.cost = changeOrder.cost + sku.num * sku.price;
            });
            return changeOrder.cost;
        }
    };

    $scope.saveNew = function(neworder) {
        console.log("save new Order");
        remove(neworder);
        db.add('store', neworder).then(function(result) {
            console.log("DB change orderID:", result);
            $scope.orderList.push(neworder);
            $scope.hideNew();
        });

    };

    $scope.exportData = function() {
        $scope.skuList = [];
        $scope.orderList.forEach(ele => {
            $.each(ele['skulist'], function(index, item) {
                $scope.skuInfo = {
                    orderid: "",
                    orderCost: "",
                    payment: "",
                    sku: "",
                    price: "",
                    num: "",
                    brand: "",
                    time: ""
                };
                $scope.skuInfo.brand = item.brand;
                $scope.skuInfo.num = parseInt(item.num);
                $scope.skuInfo.price = parseInt(item.price);
                $scope.skuInfo.sku = item.sku;
                $scope.skuInfo.orderid = ele['orderId'];
                $scope.skuInfo.orderCost = ele['cost'];
                $scope.skuInfo.payment = ele['pay'];
                $scope.skuInfo.time = parseInt(ele['created_at']);
                $scope.skuList.push($scope.skuInfo);
            });
        });
        var createXLSLFormatObj = [];
        /* XLS Head Columns */
        var xlsHeader = ["订单号", "订单总价", "支付方式", "SKU", "单价", "数量", "品牌", "订单日期"];
        createXLSLFormatObj.push(xlsHeader);

        $scope.skuList.forEach(function(i) {
            var innerRowData = [];
            $.each(i, function(val) {
                innerRowData.push(i[val]);
            });
            createXLSLFormatObj.push(innerRowData);
        });

        /* File Name */
        var filename = "清仓" + $filter('date')(new Date(), 'ddMM') + ".xlsx";

        /* Sheet Name */
        var ws_name = "clearanceSheet";

        if (typeof console !== 'undefined') console.log(new Date());
        var wb = XLSX.utils.book_new(),
            ws = XLSX.utils.aoa_to_sheet(createXLSLFormatObj);

        /* Add worksheet to workbook */
        XLSX.utils.book_append_sheet(wb, ws, ws_name);

        /* Write workbook and Download */
        if (typeof console !== 'undefined') console.log(new Date());
        XLSX.writeFile(wb, filename);
        if (typeof console !== 'undefined') console.log(new Date());
    };
});

app.directive('modal', function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            message: '=',
            show: '='
        },
        controller: function controller($scope) {
            $scope.hide = function() {
                return $scope.show = false;
            };
        },
        transclude: true,
        template: '<div class="modal">\n         <div class="modal-wrapper">\n  <h3>{{message}}</h3>\n  <ng-transclude></ng-transclude>\n </div>\n      </div>'
    };
});