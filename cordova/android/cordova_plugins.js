cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "id": "cordova-plugin-blueapp.blueappio",
        "file": "../plugins/cordova-plugin-blueapp/www/blueappio.js",
        "pluginId": "cordova-plugin-blueapp",
        "clobbers": [
            "blueappio"
        ]
    },
    {
        "id": "cordova-plugin-nordic-dfu.dfuimpl",
        "file": "../plugins/cordova-plugin-nordic-dfu/www/dfuimpl.js",
        "pluginId": "cordova-plugin-nordic-dfu",
        "clobbers": [
            "dfuimpl"
        ]
    },
    {
        "id": "cordova-plugin-splashscreen.SplashScreen",
        "file": "../plugins/cordova-plugin-splashscreen/www/splashscreen.js",
        "pluginId": "cordova-plugin-splashscreen",
        "clobbers": [
            "navigator.splashscreen"
        ]
    },
    {
        "id": "cordova-plugin-statusbar.statusbar",
        "file": "../plugins/cordova-plugin-statusbar/www/statusbar.js",
        "pluginId": "cordova-plugin-statusbar",
        "clobbers": [
            "window.StatusBar"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-whitelist": "1.2.2",
    "cordova-plugin-blueapp": "1.0.4",
    "cordova-plugin-nordic-dfu": "1.0.5",
    "cordova-plugin-splashscreen": "3.2.2",
    "cordova-plugin-statusbar": "2.1.3"
};
// BOTTOM OF METADATA
});