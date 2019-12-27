var app = angular.module('myShoppingList', ['angularjsdb']);

app.directive('focusMe', function($timeout) {
  return {
    scope: {
      focusMeIf: '='
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
    element.bind('keydown keypress', function(event) {
      if (event.which === 13) {
        scope.$apply(function() {
          scope.$eval(attrs.ngEnter, {
            event: event
          });
        });
        event.preventDefault();
      }
    });
  };
});

app.controller('myCtrl', function($scope, $http, angularjsdb, $filter) {
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
      restrict: 'A',
      scope: false,
      link: function(scope, ele, attrs) {
        ele.bind('keydown keypress', function(event) {
          if (event.which === 13) {
            scope.$apply(function() {
              scope.$eval(attrs.keyEnter);
              hasItem;
            });
            event.preventDefault();
          }
        });
      }
    };
  }

  $scope.itemList = [];
  $scope.payment = null;

  $scope.showModal = false;
  $scope.modal = false;
  $scope.modalEditor = false;

  $scope.click = function() {
    return ($scope.modal = true);
  };
  $scope.hide = function() {
    return ($scope.modal = false);
  };
  $scope.hideNew = function() {
    return ($scope.modalEditor = false);
  };
  $scope.currentID = Math.random()
    .toString(36)
    .substr(2, 6);

  var db = angularjsdb({
    name: 'wc_indexeddb',
    version: 1,
    stores: ['store', 'clearance']
  });
  // get local indexeddb data
  db.list('store').then(function(data) {
    $scope.orderList = data;
    console.log('local cache database : ', $scope.orderList);
  });
  db.list('clearance').then(function(data) {
    $scope.products = data;
    console.log('clearance cache database : ', $scope.products);
  });
  if (!$scope.products) {
    var linkUrl = '../data/clearance-2019.json';
    $http({
      method: 'GET',
      url: linkUrl
    }).then(
      function successCallback(data) {
        $scope.products = data.data['Sheet1'];
      },
      function errorCallback(response) {
        // get local indexeddb data
        console.log('error');
      }
    );
  }

  $scope.addSku = function() {
    $scope.hasItem = true;
    $scope.checkNone = $scope.products.some(function(e) {
      console.log(e);
      return e['SKU'] === parseInt($scope.addMe) || $scope.addMe;
    });
    if ($scope.addMe && $scope.addMe != '' && $scope.checkNone) {
      $scope.item = {
        brand: ' ',
        sku: ' ',
        price: ' ',
        num: ' '
      };

      let skuIndexProducts = $scope.products.findIndex(
        element => element['SKU'] == $scope.addMe
      );
      let element = $scope.products[skuIndexProducts];
      $scope.item.sku = element.SKU;
      $scope.item.price = element.RMB;
      $scope.item.brand = element.Name;

      // check brand
      //   if (element.Name === 'none' || element.Name !== '其他') {
      //     $scope.item.brand = 'Enjoy';
      //   }

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
    } else {
      console.log('输入的SKU不正确');
      $scope.checkNone = [];
    }
    $scope.addMe = null;
    document.getElementById('inputSku').focus();
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
  };

  $scope.saveOrder = function() {
    console.log($scope.payment);
    if ($scope.payment === '') {
      return;
    }

    $scope.order = {
      orderId: '',
      cost: '',
      pay: $scope.payment,
      skulist: [],
      created_at: ''
    };

    $scope.order.orderId = $scope.currentID;
    $scope.order.cost = $scope.currentCost;
    $scope.order.pay = $scope.payment;
    $scope.order.created_at = $filter('date')(new Date(), 'MM-dd HH:mm');
    $scope.itemList.forEach(eleme => {
      $scope.order.skulist.push(eleme);
    });
    db.add('store', $scope.order).then(function(result) {
      console.log('DB add orderID:', result);
      $scope.orderList.push($scope.order);
      $scope.addMe = '';
      $scope.payment = '';
      document.getElementById('inputSku').focus();
      $scope.currentID = Math.random()
        .toString(36)
        .substr(2, 6);
      $scope.currentCost = 0;
      $scope.itemList = [];
      $scope.hasItem = false;
      console.log($scope.itemList);
    });
  };

  $scope.deleteDB = function() {
    console.log('delete DB');
    $scope.modal = false;
    db.list('store').then(function(orders) {
      orders.forEach(e => {
        remove(e);
      });
    });
  };

  $scope.removeOrder = function(order) {
    remove(order);
    console.log('delete Order');
  };

  $scope.editOrder = function(order) {
    $scope.newOrder = order;
    return ($scope.modalEditor = true);
  };

  $scope.orderTotal = function(changeOrder) {
    if ($scope.modalEditor === true) {
      changeOrder.cost = 0;
      changeOrder.skulist.forEach(sku => {
        changeOrder.cost = changeOrder.cost + sku.num * sku.price;
      });
      return changeOrder.cost;
    }
  };

  $scope.saveNew = function(neworder) {
    console.log('save new Order');
    remove(neworder);
    db.add('store', neworder).then(function(result) {
      console.log('DB change orderID:', result);
      $scope.orderList.push(neworder);
      $scope.hideNew();
    });
  };

  $scope.exportData = function() {
    $scope.skuList = [];
    $scope.orderList.forEach(ele => {
      $.each(ele['skulist'], function(index, item) {
        $scope.skuInfo = {
          orderid: '',
          orderCost: '',
          payment: '',
          sku: '',
          price: '',
          num: '',
          brand: '',
          time: ''
        };
        $scope.skuInfo.brand = item.brand;
        $scope.skuInfo.num = parseInt(item.num);
        $scope.skuInfo.price = parseInt(item.price);
        $scope.skuInfo.sku = item.sku;
        $scope.skuInfo.orderid = ele['orderId'];
        $scope.skuInfo.orderCost = ele['cost'];
        $scope.skuInfo.payment = ele['pay'];
        $scope.skuInfo.time = ele['created_at'];
        $scope.skuList.push($scope.skuInfo);
      });
    });
    var createXLSLFormatObj = [];
    /* XLS Head Columns */
    var xlsHeader = [
      '订单号',
      '订单总价',
      '支付方式',
      'SKU',
      '单价',
      '数量',
      '品牌',
      '订单日期'
    ];
    createXLSLFormatObj.push(xlsHeader);

    $scope.skuList.forEach(function(i) {
      var innerRowData = [];
      $.each(i, function(val) {
        innerRowData.push(i[val]);
      });
      createXLSLFormatObj.push(innerRowData);
    });

    /* File Name */
    var filename = '清仓' + $filter('date')(new Date(), 'MMdd') + '.xlsx';

    /* Sheet Name */
    var ws_name = 'clearanceSheet';

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

  $scope.uploadExcel = function() {
    var csvFile = document.getElementById('file').files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var data = e.target.result;
      var cfb = XLS.CFB.read(data, { type: 'binary' });
      var wb = XLS.parse_xlscfb(cfb);
      var dataJSON = XLS.utils.sheet_to_row_object_array(wb.Sheets['Sheet1']);
      for (var i = 0; i < dataJSON.length; i++) {
        $scope.products.push(dataJSON[i]);
        add(dataJSON[i]);
      }
    };

    // Tell JS To Start Reading The File.. You could delay this if desired
    reader.readAsBinaryString(csvFile);
  };

  function remove(item) {
    console.log(item);
    db.delete('store', item.id).then(function(err) {
      var index = $scope.orderList.indexOf(item);
      $scope.orderList.splice(index, 1);
    });
  }
  function add(item) {
    db.add('clearance', item);
  }
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
        return ($scope.show = false);
      };
    },
    transclude: true,
    template:
      '<div class="modal">\n         <div class="modal-wrapper">\n  <h3>{{message}}</h3>\n  <ng-transclude></ng-transclude>\n </div>\n      </div>'
  };
});
