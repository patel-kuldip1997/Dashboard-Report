export const DEFAULT_REPORT_ATTRIBUTES = {
  'first-mile-epod': {
    'Reference Number': ['Reference Number', 'Reference No', 'Ref No'],
    'EPOD status': ['EPOD status', 'EPOD_status'],
    'TP date': ['TP date', 'TP Date'],
    'District': ['District']
  },
  'last-mile-vehicle-assigned': {
    'Reference Number': ['Reference Number', 'Reference No', 'DC No'],
    'DC Creation Date': ['DC Creation Date', 'Creation Date'],
    'Created At': ['Created At', 'Created Date'],
    'District': ['District', 'TP District'],
    'LR Number': ['LR Number', 'LR No'],
    'FPS Name': ['FPS Name'],
    'Area ID/FPS Name': ['Area ID/FPS Name', 'Area ID', 'Area'],
    'GSCSCL Godown': ['GSCSCL Godown', 'Godown'],
    'Transporter Name': ['Transporter Name', 'Transporter'],
    'Vehicle Number User': ['Vehicle Number User', 'Vehicle Number', 'Vehicle No'],
    'EPOD Status': ['EPOD Status', 'Status'],
    'Total DC Qty(Kg)': ['Total DC Qty(Kg)', 'Total DC Qty', 'Qty'],
    'time_of_start_trip': ['time_of_start_trip', 'Time of Start Trip', 'Start Trip Time'],
    'Time of Delivery': ['Time of Delivery', 'Delivery Time'],
    'update_deliver_date_time1': ['update_deliver_date_time1', 'Update Deliver Date Time', 'Deliver Date Time']
  },
  'lifting-report': {
    'Reference Number': ['Reference Number', 'Reference No'],
    'District': ['District', 'TP District'],
    'TP Creation Mode': ['TP Creation Mode', 'created_from'],
    'Final Quantity Allocated': ['Final Quantity Allocated'],
    'Vehicle Number': ['Vehicle Number', 'Vehicle No'],
    'Driver Status': ['Driver Status'],
    'EPOD status': ['EPOD status']
  },
  'vehicle-assigned': {
    'Reference Number': ['Reference Number', 'Reference No'],
    'District': ['District', 'TP District'],
    'TP Date': ['TP Date', 'TP date']
  },
  'weighbridge-report': {
    'Weighbridge ID': ['Weighbridge ID', 'weighbridge_id'],
    'TP date': ['TP date', 'TP Date'],
    'District': ['District'],
    'Destination Godown': ['Destination Godown'],
    'EPOD status': ['EPOD status']
  },
  'last-mile-epod': {
    'District': ['District', 'TP District', 'Godown District'],
    'DC Month': ['DC Month'],
    'DC Creation Date': ['DC Creation Date', 'DC Date', 'Creation Date'],
    'Reference Number': ['Reference Number', 'Delivery Challan Number', 'DC No', 'Reference No'],
    'EPOD Status': ['EPOD Status', 'Status'],
    'IMEI At Start': ['IMEI At Start', 'Start IMEI', 'IMEI_Start'],
    'IMEI At End': ['IMEI At End', 'End IMEI', 'IMEI_End']
  },
  'last-mile-imei': {
    'Reference Number': ['Reference Number', 'Delivery Challan Number', 'DC No', 'Reference No'],
    'District': ['District', 'TP District', 'Godown District'],
    'DC Creation Date': ['DC Creation Date', 'DC Date', 'Creation Date'],
    'GSCSCL Godown': ['GSCSCL Godown', 'Godown'],
    'Transporter Name': ['Transporter Name', 'Transporter', 'DSD Transporter Name'],
    'IMEI At Start': ['IMEI At Start', 'Start IMEI', 'IMEI_Start'],
    'IMEI At End': ['IMEI At End', 'End IMEI', 'IMEI_End']
  },
  'godown-to-miller': {
    'TP District': ['TP District', 'District'],
    'Lifting Location Name': ['Lifting Location Name'],
    'TP Destination Name': ['TP Destination Name'],
    'Vehicle Number': ['Vehicle Number', 'Vehicle No'],
    'TP Date': ['TP Date', 'TP date'],
    'Final Quantity Allocated': ['Final Quantity Allocated', 'Net Weight']
  },
  'miller-to-godown': {
    'GP Source Name': ['GP Source Name'],
    'GP Destination Name': ['GP Destination Name'],
    'District': ['District', 'TP District'],
    'Vehicle Number': ['Vehicle Number', 'Vehicle No'],
    'TP Date': ['TP Date', 'TP date'],
    'Final Quantity Allocated': ['Final Quantity Allocated', 'Net Weight']
  },
  'multi-trip-analysis': {
    'Vehicle Number': ['Vehicle Number', 'Vehicle No', 'Truck No'],
    'Reference Number': ['Reference Number', 'Reference No'],
    'TP Date': ['TP Date', 'TP date']
  },
  'eta-route': {
    'Route Code': ['Route Code', 'Route_Code', 'Route'],
    'Origin_Lat': ['Origin_Lat', 'Origin Lat'],
    'Origin_Lng': ['Origin_Lng', 'Origin Lng'],
    'Origin_Lat_Origin_Lng': ['Origin_Lat_Origin_Lng', 'Origin Lat Origin Lng'],
    'Destination_Lat': ['Destination_Lat', 'Destination Lat'],
    'Destination_Lng': ['Destination_Lng', 'Destination Lng'],
    'Destination_Lat_Destination_Lng': ['Destination_Lat_Destination_Lng', 'Destination Lat Destination Lng'],
    'Actual_Time_Mins': ['Actual_Time_Mins', 'Transit Time(hh:mm)', 'Transit Time']
  }
};
