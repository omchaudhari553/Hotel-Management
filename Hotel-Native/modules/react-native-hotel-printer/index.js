import { NativeModules, Platform } from 'react-native';

const { HotelPrinterModule } = NativeModules;

export default HotelPrinterModule || null;

