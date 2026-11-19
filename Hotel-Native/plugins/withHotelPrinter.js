const { withAndroidManifest, withPlugins } = require('@expo/config-plugins');

const withPrinterManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application?.[0];

    if (!mainApplication) return config;

    // Ensure permissions
    const permissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ];

    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    permissions.forEach((perm) => {
      const exists = androidManifest.manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === perm
      );
      if (!exists) {
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    // Add HotelPrintService to application if not present
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const serviceName = 'com.hotelmanagement.printer.HotelPrintService';
    const serviceExists = mainApplication.service.some(
      (s) => s.$?.['android:name'] === serviceName
    );

    if (!serviceExists) {
      mainApplication.service.push({
        $: {
          'android:name': serviceName,
          'android:permission': 'android.permission.BIND_PRINT_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.printservice.PrintService',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.printservice',
              'android:resource': '@xml/printservice',
            },
          },
        ],
      });
    }

    return config;
  });
};

module.exports = (config) => {
  return withPlugins(config, [withPrinterManifest]);
};

