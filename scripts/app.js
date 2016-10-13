//alert('app');
var app;
(function () {
    app = angular.module('bleExplorerApp', ['ngMaterial', "ui.router"])
        .config(function ($stateProvider, $urlRouterProvider, $mdThemingProvider) {

            $stateProvider

                .state('load', {
                    url: "/load",
                    templateUrl: "views/devicelist.html",
                    controller: "loadCtrl"
                })
                .state('devicelist', {
                    url: "/devicelist",
                    templateUrl: "views/devicelist.html",
                    controller: "devicelistCtrl"
                })
                .state('servicelist', {
                    url: "/servicelist",
                    templateUrl: "views/servicelist.html",
                    controller: "servicelistCtrl"
                })
                .state('characteristiclist', {
                    url: "/characteristiclist",
                    templateUrl: "views/characteristiclist.html",
                    controller: "characteristiclistCtrl"
                })
                .state('descriptorlist', {
                    url: "/descriptorlist",
                    templateUrl: "views/descriptorlist.html",
                    controller: "descriptorlistCtrl"
                });

            $urlRouterProvider.otherwise('/load');

            $mdThemingProvider.theme('default')
                .primaryPalette('blue')
                .accentPalette('indigo');
            $mdThemingProvider.theme('success-toast');
            $mdThemingProvider.theme('error-toast');
        });

})();

var match,
    pl = /\+/g, // Regex for replacing addition symbol with a space
    search = /([^&=]+)=?([^&]*)/g,
    decode = function (s) {
        return decodeURIComponent(s.replace(pl, " "));
    },
    query = window.location.search.substring(1);

var urlParams = {};
while (match = search.exec(query))
    urlParams[decode(match[1])] = decode(match[2]);

var cordovaApp = urlParams['app'];


app.run(['$document', '$window', function ($document, $window) {
    var document = $document[0]; //unwrap the document from the jquery wrapper // RMB HACK FOR IPAD NOT FOCUSING INPUTS INSIDE IFRAME 
    document.addEventListener('click', function (event) {
        var hasFocus = document.hasFocus();
        if (!hasFocus) $window.focus();
    });
}]);

window.bleexplorer = {};

function initializeGattip() {
    var gattip = null;

    function BLEEXPLORER() {
        var peripheral = {};
        var g = null;
        var _currentgateway = null;

        g = navigator.bluetooth.gattip;

        g.once('state', function (state) {
            window.bleexplorer.showAlert("Please turn on Bluetooth to scan peripherals.");
        });

        g.once('ready', function (gateway) {
            window.bleexplorer._currentgateway = gateway;
            // console.log('ready');
            window.bleexplorer.scanStarts();
            window.bleexplorer._currentgateway.scan(function () {
                // console.log('Started scan');
                window.bleexplorer._currentgateway.on('scan', window.bleexplorer.onScan);
            });
        });

        g.on('error', function (err) {
            console.log(err);
            if (window.bleexplorer.isShowingLoadingIndic && !window.bleexplorer.filterScan) {
                window.bleexplorer.hideDialog();
            }

            if (err.message.indexOf('"method":"ad"') > 0) {
                window.bleexplorer.showAlert('Unable to connect with device! Try again.');
            } else if (err.message.indexOf('Device could not be connected') > 0 || err.message.indexOf('Timed out while waiting for discovery to complete') > 0) {
                window.bleexplorer.showAlert('Device could not be connected! Try again');
            } else if (err.message.indexOf('Device is disconnected while discovering services') > 0) {
                window.bleexplorer.showAlert('Device is disconnected while discovering services..');
            } else if (err.message.indexOf('Failed to get services') > 0) {
                window.bleexplorer.showAlert('Failed to get services. Try again');
            } else if (err.message.indexOf('Unexpectedly disconnected') > 0) {
                window.bleexplorer.showAlert('Device is disconnected! Try again');
                window.bleexplorer.currentPeripheral = null;
                window.bleexplorer.mainState();
                window.bleexplorer.scanStarts();
                window.bleexplorer._currentgateway.scan(function () {
                    // console.log('Started scan');
                    window.bleexplorer._currentgateway.on('scan', window.bleexplorer.onScan);
                });
            } else if (err.message.indexOf('Invalid Length') > 0 || err.message.indexOf('length is invalid') > 0) {
                window.bleexplorer.showAlert('Invalid Length. Please check the entered value');
            } else if (err.message.indexOf('Timed out') > 0) {
                window.bleexplorer.showAlert('Timed out while processing the Request');
            } else if (err.message.indexOf('Unable to find the requested device') > 0) {
                window.bleexplorer.showAlert('Sorry, unable to find the requested device. Issue a scan first');
            } else if (err.message.indexOf('Operation failed with ATT') > 0) {
                window.bleexplorer.showAlert('Gateway Error: Operation failed with ATT error');
            } else {
                window.bleexplorer.showAlert(err.message);
            }
        });
    }

    window.bleexplorer = new BLEEXPLORER();
}

app.controller('characteristiclistCtrl', function ($scope, $state, $mdDialog) {
    $scope.isApp = false;

    var util = new Util();

    if (cordovaApp == 'true') {
        $scope.isApp = true;
    }
    $scope.bleexplorer = bleexplorer;

    if ($scope.bleexplorer.isNotifying) {
        $scope.bleexplorer.currentCharacteristic.enableNotifications(function (charac, value) {
            $scope.bleexplorer.isNotifying = value;
            // console.log('Disable the notification ', value);
        }, false);
    }

    $scope.discoverDescriptors = function (characteristic) {
        $scope.bleexplorer.currentCharacteristic = characteristic;
        $state.go('descriptorlist');
    };

    $scope.back = function () {
        history.go(-1);
    };

    $scope.gotologview = function () {
        // console.log('log view click');
        return cordova.exec(function () {
                console.log("Success");
            },
            function () {
                console.log("Fail");
            },
            "CallNativePlugin",
            "log",
            ["log"]);
    };

    $scope.$on('$destroy', function iVeBeenDismissed() {
        // console.log('destroy characteristiclist ctrl');
        $mdDialog.cancel();
    });
});
app.controller('descriptorlistCtrl', function ($scope, $state, $mdDialog) {
    // console.log('descriptorlistCtrl');
    $scope.isApp = false;

    var util = new Util();

    if (cordovaApp == 'true') {
        $scope.isApp = true;
    }
    $scope.bleexplorer = bleexplorer;

    $scope.readformat = "Hex";
    $scope.writeformat = 'Hex';

    var util = new Util();
    $scope.bleexplorer.isNotifying = false;
    var charValue = '';

    if ($scope.bleexplorer.currentCharacteristic.properties.Read && $scope.bleexplorer.currentCharacteristic.properties.Read.enabled) {
        $scope.bleexplorer.currentCharacteristic.readValue(function (char, value) {
            // console.log("Got value ", value);
            charValue = value;
            $scope.changeFormat();
        });
    }

    function writing(value) {
        if (util.isValidHex(value)) {
            $scope.bleexplorer.currentCharacteristic.writeValue(function (char) {
                // console.log('write success');
                $scope.bleexplorer.onSuccess('Successfully wrote the value ');
            }, value);
        } else {
            $scope.bleexplorer.showAlert('Entered value is Invalid.');
        }
    }

    $scope.changeFormat = function () {
        switch ($scope.readformat) {
            case 'ASCII':
                $scope.currentValue = util.hex2a(charValue);
                break;
            case 'Int':
                $scope.currentValue = util.hex2dec(charValue);
                break;
            case 'Binary':
                $scope.currentValue = util.hex2b(charValue);
                break;
            default:
                $scope.currentValue = charValue;
                break;
        }
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    };

    $scope.writeValue = function () {
        var writeTemp = '';
        if ($scope.inputs !== '' && $scope.inputs !== null && $scope.inputs !== undefined) {
            switch ($scope.writeformat) {
                case 'ASCII':
                    writeTemp = util.a2hex($scope.inputs);
                    writing(writeTemp)
                    break;
                case 'Int':
                    writeTemp = util.dec2hex($scope.inputs);
                    writing(writeTemp)
                    break;
                case 'Binary':
                    writeTemp = $scope.inputs; //TODO
                    break;
                default:
                    writeTemp = $scope.inputs;
                    writing(writeTemp)
                    break;
            }
        } else {
            $scope.bleexplorer.showAlert('Enter the value to write.');
        }
    };

    $scope.readAgain = function () {
        if ($scope.bleexplorer.currentCharacteristic.properties.Read && $scope.bleexplorer.currentCharacteristic.properties.Read.enabled) {
            $scope.bleexplorer.currentCharacteristic.readValue(function (char, value) {
                // console.log("Got value ", value);
                charValue = value;
                $scope.changeFormat();
            });
        }
    };

    $scope.notify = function () {
        var value = '';
        $scope.bleexplorer.currentCharacteristic.on('valueChange', function (charac) {
            charValue = charac.value;
            $scope.changeFormat();
        }, value);
        $scope.bleexplorer.currentCharacteristic.enableNotifications(function (charac, value) {
            $scope.bleexplorer.isNotifying = value;
            // console.log('Enabled the notification ', value);
            $scope.$apply();
        }, true);
    };

    $scope.stopNotify = function () {
        $scope.bleexplorer.currentCharacteristic.enableNotifications(function (charac, value) {
            $scope.bleexplorer.isNotifying = value;
            // console.log('Disable the notification ', value);
            $scope.$apply();
        }, false);
    };

    $scope.back = function () {
        history.go(-1);
    };

    $scope.gotologview = function () {
        // console.log('log view click');
        return cordova.exec(function () {
                console.log("Success");
            },
            function () {
                console.log("Fail");
            },
            "CallNativePlugin",
            "log",
            ["log"]);
    };

    $scope.$on('$destroy', function iVeBeenDismissed() {
        // console.log('destroy descriptorlistCtrl');
        $mdDialog.cancel();
    });

});

function DeviceInfoController($scope, $mdDialog, peripheral) {
    // console.log('DeviceInfoController');
    $scope.peripheral = peripheral;
    var util = new Util();

    function showdata(peripheral) {
        $scope.name = peripheral.name;
        $scope.uuid = peripheral.uuid;
        $scope.connectable = peripheral.connectable;
        $scope.txpowerLevel = peripheral.txPowerLevel;
        $scope.serviceUUIDs = peripheral.getAllAdvertisedServiceUUIDs();
        $scope.manufacturerData = peripheral.getAllMfrData();
        if (Object.keys($scope.manufacturerData).length == 0) {
            $scope.manufacturerData = undefined;
        }
        $scope.rssi = peripheral.rssi;
    }

    $scope.showformat = 'Hex';
    showdata($scope.peripheral);
    $scope.peripheral1 = $scope.peripheral;

    $scope.okClick = function () {
        $mdDialog.cancel();
    };
}

function LoadingIndicatorController($scope, loadingText) {
    // console.log('LoadingIndicController');
    $scope.bleexplorer = bleexplorer;
    $scope.bleexplorer.isShowingLoadingIndic = true;
    $scope.loading_text = loadingText;
}

function NoDeviceFoundController($scope, $mdDialog, $timeout) {
    // console.log('NoDeviceFoundController');
    $scope.loading_text = "No devices found with given filters. Do you want to display all near by devices ?";
    $scope.bleexplorer = bleexplorer;

    $scope.okClick = function () {
        $mdDialog.hide();
        $scope.bleexplorer._currentgateway.stopScan(function () {
            $scope.bleexplorer.filtername = '';
            $scope.bleexplorer.filteruuid = '';
            $scope.bleexplorer.showLoadingIndicator('', 'Scanning for Peripherals....');
            $scope.bleexplorer.stopScanEvent($scope.bleexplorer.filtername, $scope.bleexplorer.filteruuid);
            $scope.bleexplorer._currentgateway.scan(function () {
                // console.log('Re-Started scan');
                $scope.bleexplorer._currentgateway.on('scan', $scope.bleexplorer.onScan);
                $timeout(function () {
                    if (($scope.bleexplorer.filtername !== '' || $scope.bleexplorer.filteruuid !== '') && ($scope.bleexplorer.filter_scanned_perips_length === undefined || $scope.bleexplorer.filter_scanned_perips_length < 1) && $scope.bleexplorer.filterFound === false) {
                        $scope.bleexplorer.showNoDeviceFoundDialog();
                        $scope.bleexplorer.filterFound = false
                    }
                }, 7000);
            });
        });
    };
}

function alertDialogController($scope, $mdDialog, alertText) {
    // console.log('alertDialogController');
    $scope.alert_text = alertText;

    $scope.okClick = function () {
        $mdDialog.hide();
    };
}

app.controller('loadCtrl', function ($scope, $state) {
    // console.log('loadCtrl');
    if (cordovaApp == 'true') {
        document.addEventListener("deviceready", onLoad, false);
        function onLoad() {
            initializeGattip();
            $state.go('devicelist');
        }
    } else {
        initializeGattip();
        $state.go('devicelist');
    }

});

app.controller('devicelistCtrl', function ($scope, $state, $stateParams, $mdDialog, $mdToast, $mdBottomSheet, $location) {
    // console.log('devicelistCtrl');
    $location.replace();
    $scope.isApp = false;

    var util = new Util();

    if (cordovaApp == 'true') {
        $scope.isApp = true;
    }
    $scope.bleexplorer = bleexplorer;
    $scope.bleexplorer.scanned_perips = [];
    $scope.bleexplorer.filterScan = false;
    $scope.bleexplorer.filtername = '';
    $scope.bleexplorer.filteruuid = '';

    $scope.scanOption = 'Stop Scan';
    $scope.showOption = 'Stop Scan';

    $scope.userFilters = "No Filters";
    $scope.isScanning = false;


    function startScan() {
        $scope.bleexplorer.currentPeripheral = null;
        $scope.perip_connect = false;
        $scope.isScanning = false;
        $scope.bleexplorer.scanned_perips = [];

        $scope.bleexplorer._currentgateway.stopScan(function () {
            $scope.bleexplorer.showLoadingIndicator('', 'Scanning for Peripherals....');
            $scope.bleexplorer._currentgateway.scan(function () {
                // console.log('Started scan');
                $scope.bleexplorer._currentgateway.on('scan', $scope.bleexplorer.onScan);
            });
        });
    }

    function disConnectFunc() {
        $scope.bleexplorer.onError('Peripheral disconnected.');
        startScan();
    }

    if ($scope.bleexplorer && $scope.bleexplorer.currentPeripheral) {
        $scope.bleexplorer.currentPeripheral.disconnect(function (peripheral) {
            // console.log('Peripheral ', peripheral.uuid, ' disconnected');
            disConnectFunc();
        });
    }else{
        // Need this one for Android remote 
        if(/Android/i.test(navigator.userAgent) && $scope.bleexplorer && $scope.bleexplorer._currentgateway){ 
            startScan();
        }
    }

    $scope.bleexplorer.onSuccess = function (message) {
        $mdToast.show(
            $mdToast.simple()
                .textContent(message)
                .position('top')
                .theme("success-toast")
                .hideDelay(2500)
        );
    };

    $scope.bleexplorer.onError = function (message) {
        $mdToast.show(
            $mdToast.simple()
                .textContent(message)
                .position('top')
                .theme('error-toast')
                .hideDelay(2500)
        );
    };

    $scope.bleexplorer.scanStarts = function (message) {
        $scope.bleexplorer.showLoadingIndicator('', 'Scanning for Peripherals....');
    };

    $scope.bleexplorer.mainState = function () {
        $state.go('devicelist');
    };

    $scope.bleexplorer.stopScanEvent = function (filtername, filteruuid) {
        $scope.perip_connect = false;
        $scope.isScanning = false;
        $scope.bleexplorer.scanned_perips = [];
        $scope.scanOption = 'Scan';
        $scope.showOption = 'Scan';

        if (filtername !== '' && typeof filtername !== 'undefined') {
            $scope.userFilters = filtername;
            if (filteruuid !== '' && typeof filteruuid !== 'undefined') {
                $scope.userFilters = $scope.userFilters + ' ' + filteruuid;
            }
        } else if (filteruuid !== '' && typeof filteruuid !== 'undefined') {
            $scope.userFilters = filteruuid;
        } else {
            $scope.userFilters = "No Filters";
        }
    };

    $scope.openMenu = function ($mdOpenMenu, ev) {
        if ($scope.showOption === 'Stop Scan') {
            $scope.scanStopScan();
        } else {
            $mdOpenMenu(ev);
        }
    };

    $scope.scanStopScan = function () {
        $scope.bleexplorer.filterScan = false;
        if ($scope.isScanning) {
            $scope.bleexplorer._currentgateway.stopScan(function () {
                $scope.isScanning = false;
                $scope.scanOption = 'Scan';
                $scope.showOption = 'Options';
                $scope.$apply();
            });
        } else {
            $scope.bleexplorer.currentPeripheral = null;
            $scope.perip_connect = false;
            $scope.isScanning = false;
            $scope.bleexplorer.scanned_perips = [];
            $scope.bleexplorer.filtername = '';
            $scope.bleexplorer.filteruuid = '';
            $scope.bleexplorer.stopScanEvent();

            $scope.bleexplorer.showLoadingIndicator('', 'Scanning for Peripherals....');
            $scope.bleexplorer._currentgateway.scan(function () {
                // console.log('Started scan');
                $scope.scanOption = 'Stop Scan';
                $scope.showOption = 'Stop Scan';
                $scope.$apply();
                $scope.bleexplorer._currentgateway.on('scan', $scope.bleexplorer.onScan);
            });
        }
    };

    $scope.sortByName = function () {
        $scope.showOption = 'Sort by Name';
        $scope.bleexplorer.scanned_perips.sort(function (a, b) {
            return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
        });
    };

    $scope.sortByRSSI = function () {
        $scope.showOption = 'Sort by Near';
        $scope.bleexplorer.scanned_perips.sort(function (a, b) {
            return (Math.abs(a.rssi) > Math.abs(b.rssi) ? 1 : -1);
        });
    };

    $scope.bleexplorer.onScan = function (peripheral) {
        $scope.scanOption = 'Stop Scan';
        $scope.showOption = 'Stop Scan';

        if (!$scope.isScanning) {
            $scope.isScanning = true;

            $scope.devices_align = true;
            setTimeout(function () {
                $scope.devices_align = false;
            }, 3 * 1000);
        }

        util.updatesignalimage(peripheral);
        peripheral.txpowerLevel = peripheral.txPowerLevel;
        peripheral.serviceUUIDs = peripheral.getAllAdvertisedServiceUUIDs();

        //Getting the user entered filters
        var filtername = $scope.bleexplorer.filtername;
        var filteruuid = $scope.bleexplorer.filteruuid;

        var serv_arr = [];
        if (filteruuid !== '' && typeof filteruuid !== 'undefined') {
            serv_arr = filteruuid.trim().split(/\s*,\s*/);
            for (var i = 0; i < serv_arr.length; i++) {
                serv_arr[i] = serv_arr[i].toUpperCase();
            }
        }

        var foundServices = false;
        var count = 0;
        // Checking user enter's both the filters or not
        if ((serv_arr.length > 0) && (filtername !== '' && typeof filtername !== 'undefined')) {
            if (serv_arr.length > 0) {
                for (var k = 0; k < serv_arr.length; k++) {
                    if (typeof peripheral.serviceUUIDs !== 'undefined' && peripheral.serviceUUIDs.length > 0) {
                        if (peripheral.serviceUUIDs.indexOf(serv_arr[k]) > -1) {
                            count++;
                        }
                    }
                }
                if (count > 0) {
                    foundServices = true;
                }
                if (foundServices && ((peripheral.name.toUpperCase() === filtername.toUpperCase()) || (peripheral.name.toUpperCase().indexOf(filtername.toUpperCase()) > -1))) {
                    $scope.bleexplorer.scanned_perips = util.pushUniqueObj($scope.bleexplorer.scanned_perips, peripheral);
                    $scope.bleexplorer.filter_scanned_perips = util.pushUniqueObj($scope.bleexplorer.filter_scanned_perips, peripheral);
                    $scope.bleexplorer.filterFound = true;
                    if ($scope.bleexplorer.isShowingLoadingIndic) $scope.bleexplorer.hideDialog();
                }
            }
        }
        // Checking whether user entered any filter or not
        else if ((serv_arr.length > 0) || (filtername !== '' && typeof filtername !== 'undefined')) {
            // filtering based on service UUID's
            if (serv_arr.length > 0) {
                for (var j = 0; j < serv_arr.length; j++) {
                    if (typeof peripheral.serviceUUIDs !== 'undefined' && peripheral.serviceUUIDs.length > 0) {
                        if (peripheral.serviceUUIDs.indexOf(serv_arr[j]) > -1) {
                            count++;
                        }
                    }
                }
                if (count > 0) {
                    foundServices = true;
                }
                if (foundServices) {
                    $scope.bleexplorer.scanned_perips = util.pushUniqueObj($scope.bleexplorer.scanned_perips, peripheral);
                    $scope.bleexplorer.filter_scanned_perips = util.pushUniqueObj($scope.bleexplorer.filter_scanned_perips, peripheral);
                    $scope.bleexplorer.filterFound = true;
                    if ($scope.bleexplorer.isShowingLoadingIndic) $scope.bleexplorer.hideDialog();
                }
            }
            // filtering based on Name
            if ((filtername !== '' && typeof filtername !== 'undefined')) {
                if ((peripheral.name.toUpperCase() === filtername.toUpperCase()) || (peripheral.name.toUpperCase().indexOf(filtername.toUpperCase()) > -1)) {
                    $scope.bleexplorer.scanned_perips = util.pushUniqueObj($scope.bleexplorer.scanned_perips, peripheral);
                    $scope.bleexplorer.filter_scanned_perips = util.pushUniqueObj($scope.bleexplorer.filter_scanned_perips, peripheral);
                    $scope.bleexplorer.filterFound = true;
                    if ($scope.bleexplorer.isShowingLoadingIndic) $scope.bleexplorer.hideDialog();
                }
            }
        } else {
            $scope.bleexplorer.filterScan = false;
            $scope.bleexplorer.scanned_perips = util.pushUniqueObj($scope.bleexplorer.scanned_perips, peripheral);
            if ($scope.bleexplorer.isShowingLoadingIndic) $scope.bleexplorer.hideDialog();
        }

        if ($scope.devices_align) {
            $scope.bleexplorer.scanned_perips.sort(function (a, b) {
                return (Math.abs(a.rssi) > Math.abs(b.rssi) ? 1 : -1);
            });
        }
        $scope.perip_connect = false;
        $scope.bleexplorer.scanned_perips_length = $scope.bleexplorer.scanned_perips.length;
        if (typeof $scope.bleexplorer.filter_scanned_perips !== 'undefined') {
            $scope.bleexplorer.filter_scanned_perips_length = $scope.bleexplorer.filter_scanned_perips.length;
        }

        $scope.$apply();
    };

    $scope.showAdvInfoDialog = function (ev, peripheral) {
        $mdDialog.show({
            controller: DeviceInfoController,
            templateUrl: 'views/device_info.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            locals: {
                peripheral: peripheral
            }
        });
    };

    $scope.bleexplorer.showLoadingIndicator = function (ev, text) {
        $mdDialog.show({
            controller: LoadingIndicatorController,
            templateUrl: 'views/loading.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: false,
            locals: {
                loadingText: text
            }
        });
    };

    $scope.bleexplorer.showAlert = function (text, ev) {
        $mdDialog.show({
            controller: alertDialogController,
            templateUrl: 'views/alert.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: false,
            locals: {
                alertText: text
            }
        });
    };

    $scope.bleexplorer.hideDialog = function () {
        $scope.bleexplorer.isShowingLoadingIndic = false;
        $mdDialog.cancel();
    };

    $scope.showfilterOptions = function (ev) {
        $scope.alert = '';
        $mdDialog.show({
            controller: filterCtrl,
            templateUrl: 'views/filter.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
        });
    };

    $scope.connectPeripheral = function (peripheral) {
        peripheral.once('connected', function (peripheral) {
            // console.log('Peripheral ', peripheral.uuid, ' connected');
        });

        peripheral.once('disconnected', function (peripheral) {
            // console.log('Peripheral ', peripheral.uuid, ' disconnected');
            if ($scope.bleexplorer.currentPeripheral) {
                disConnectFunc();
                $state.go('devicelist');
            }
        });

        var connectable = false; 
        if (peripheral.connectable) {
            connectable = peripheral.connectable;
        } else {
            connectable = true;
        }

        if (connectable !== false) {
            $scope.bleexplorer._currentgateway.stopScan(function () {
                $scope.isScanning = false;
                $scope.scanOption = 'Scan';
                $scope.showOption = 'Options';

                $scope.bleexplorer.showLoadingIndicator('', 'Connecting to Peripheral....');

                peripheral.connect(function () {
                    $scope.bleexplorer.currentPeripheral = peripheral;
                    $scope.perip_connect = true;
                    // console.log('Found', Object.keys(peripheral.getAllServices()).length, 'services');
                    $scope.bleexplorer.currentPeripheral.services = peripheral.getAllServices();
                    $state.go('servicelist');
                    if ($scope.bleexplorer.isShowingLoadingIndic) {
                        $scope.bleexplorer.hideDialog();
                    }
                });
            });
        } else {
            $scope.bleexplorer.showAlert('Selected device is not connectable');
        }
    };

    $scope.gotoremoteview = function () {
        // console.log('remote view click');
        return cordova.exec(function () {
                console.log("Success");
            },
            function () {
                console.log("Fail");
            },
            "CallNativePlugin",
            "remote",
            ["remote"]);
    };

    $scope.gotologview = function () {
        // console.log('log view click');
        return cordova.exec(function () {
                console.log("Success");
            },
            function () {
                console.log("Fail");
            },
            "CallNativePlugin",
            "log",
            ["log"]);
    };
    if($scope.bleexplorer){
        $scope.bleexplorer.stopScanEvent();
    }

    $scope.$on('$destroy', function iVeBeenDismissed() {
        // console.log('destroy devicelistCtrl');
        $mdDialog.cancel();
    });

});
function filterCtrl($scope, $mdBottomSheet, $timeout, $mdDialog) {
    $scope.bleexplorer = bleexplorer;
    $scope.filter_name = $scope.bleexplorer.filtername;
    $scope.filter_serv_uuid = $scope.bleexplorer.filteruuid;
    $scope.bleexplorer.filterFound = false;

    var util = new Util();

    $scope.clearFilterName = function () {
        $scope.filter_name = '';
    };

    $scope.clearFilterUUID = function () {
        $scope.filter_serv_uuid = '';
    };

    $scope.bleexplorer.showNoDeviceFoundDialog = function (ev, peripheral) {
        $mdDialog.show({
            controller: NoDeviceFoundController,
            templateUrl: 'views/no_device_found.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: false
        });
    };

    $scope.scanPeripsWithFilters = function () {
        $scope.bleexplorer.filtername = $scope.filter_name;
        $scope.bleexplorer.filteruuid = $scope.filter_serv_uuid;
        $scope.bleexplorer.filterScan = true;
        $scope.bleexplorer.filter_scanned_perips = [];
        $scope.bleexplorer.stopScanEvent($scope.bleexplorer.filtername, $scope.bleexplorer.filteruuid);
        $scope.bleexplorer.showLoadingIndicator('', 'Filtering scanned Peripherals....');

        // console.log('Filtering scanned Peripherals');
        $timeout(function () {
            if (($scope.bleexplorer.filtername !== '' || $scope.bleexplorer.filteruuid !== '') && ($scope.bleexplorer.filter_scanned_perips_length === undefined || $scope.bleexplorer.filter_scanned_perips_length < 1) && $scope.bleexplorer.filterFound === false) {
                $scope.bleexplorer.showNoDeviceFoundDialog();
                $scope.bleexplorer.filterFound = false;
                $scope.bleexplorer.filterScan = false;
            }
        }, 7000);

        $mdBottomSheet.hide();
    };

}

app.controller('servicelistCtrl', function ($scope, $state, $timeout, $mdDialog) {
    // console.log('servicelistCtrl');
    $scope.isApp = false;

    var util = new Util();

    if (cordovaApp == 'true') {
        $scope.isApp = true;
    }
    $scope.bleexplorer = bleexplorer;
    var util = new Util();

    $scope.discoverCharacteristics = function (service) {
        $scope.bleexplorer.currentService = service;
        $scope.bleexplorer.currentService.characteristics = service.getAllCharacteristics();

        for (var char in $scope.bleexplorer.currentService.characteristics) {
            $scope.bleexplorer.currentService.characteristics[char].properties = $scope.bleexplorer.currentService.characteristics[char].allProperties();
        }

        // Code to get the characteristic name from the descriptor
        var characs = [];
        for (var cUUID in $scope.bleexplorer.currentService.characteristics) {
            characs.push($scope.bleexplorer.currentService.characteristics[cUUID]);
            $scope.bleexplorer.currentService.characteristics[cUUID].descriptors = $scope.bleexplorer.currentService.characteristics[cUUID].getAllDescriptors();
        }

        function setCharName(desc, value) {
            $scope.bleexplorer.currentService.characteristics[desc.characteristic().uuid].characteristicName = util.hex2a(value);
            $scope.$apply();
            $timeout(); // HACK : To update the UI
        }

        if (characs.length > 0) {
            (function myLoop(i) {
                setTimeout(function () {
                    var descriptors = characs[i].getAllDescriptors();
                    for (var dUUID in descriptors) {
                        if (dUUID.indexOf('2901') > -1) {
                            // console.log("i value ", i, "  ", characs[i].uuid);
                            // if (descriptors[dUUID].properties && descriptors[dUUID].properties.Read && descriptors[dUUID].properties.Read.enabled) {
                            descriptors[dUUID].readValue(function (desc, value) {
                                // console.log("Got value ", value);
                                setCharName(desc, value);
                            });
                            // }
                            break;
                        }
                    }
                    if (i--) {
                        myLoop(i);
                    }
                }, 200);
            })(characs.length - 1);
        }

        $state.go('characteristiclist');
    };

    $scope.back = function () {
        history.go(-1);
    };

    $scope.gotologview = function () {
        // console.log('log view click');
        return cordova.exec(function () {
                console.log("Success");
            },
            function () {
                console.log("Fail");
            },
            "CallNativePlugin",
            "log",
            ["log"]);
    };

    $scope.$on('$destroy', function iVeBeenDismissed() {
        // console.log('destroy servicelistCtrl');
        $mdDialog.cancel();
    });
});

function Util() {

    this.updatesignalimage = function (peripheral) {
        if (!(peripheral && peripheral.rssi)) {
            return peripheral;
        }
        if (Math.abs(peripheral.rssi) < 45) {
            peripheral.image = 'images/signal_5@2x.png';
        } else if (Math.abs(peripheral.rssi) < 55) {
            peripheral.image = 'images/signal_4@2x.png';
        } else if (Math.abs(peripheral.rssi) < 65) {
            peripheral.image = 'images/signal_3@2x.png';
        } else if (Math.abs(peripheral.rssi) < 75) {
            peripheral.image = 'images/signal_2@2x.png';
        } else {
            peripheral.image = 'images/signal_1@2x.png';
        }

        return peripheral;
    };

    this.pushUniqueObj = function (array, item) {
        var found = false,
            idx = -1;
        if (typeof array !== 'undefined') {
            for (idx = 0; idx < array.length; idx++) {
                if (array[idx].uuid === item.uuid) {
                    found = true;
                    break;
                }
            }
        } else {
            array = [];
        }
        if (found) {
            array.splice(idx, 1, item);
            return array;
        } else {
            array.push(item);
            return array;
        }
    };

    this.isValidHex = function (sNum) {
        var isHex = true;

        if (sNum.length < 2 || sNum.length % 2 != 0 || !(/^[0-9a-fA-F]+$/.test(sNum))) {
            isHex = false;
        }

        return isHex;
    };

    this.isEmpty = function (obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                return false;
        }
        return JSON.stringify(obj) === JSON.stringify({});
    };

    this.hex2a = function (hexx) {
        if (hexx) {
            var hex = hexx.toString();
            var str = '';
            for (var i = 0; i < hex.length; i += 2) {
                str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            return str;
        }
    };

    this.hex2dec = function (hexx) {
        return parseInt(hexx, 16);
    };

    this.hex2b = function (hexx) {
        var num = hex2i(hexx);
        return num.toString(2);
    };

    this.a2hex = function (asci) {
        var str = '';
        for (var a = 0; a < asci.length; a++) {
            str = str + asci.charCodeAt(a).toString(16);
        }
        return str;
    };

    this.dec2hex = function (d) {
        var hex = Number(d).toString(16);
        while (hex.length < 2) {
            hex = '0' + hex;
        }

        return hex;
    };

    return this;
}