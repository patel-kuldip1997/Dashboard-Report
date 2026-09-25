export const DEFAULT_REPORT_ATTRIBUTES = {
  'ro-allocation-dsm': {
    'Created At': ['Created At', 'Pick Up Date', 'Lifting Target Date', 'RO date'],
    'District': ['District', 'district_name', 'TP District'],
    'RO ID': ['RO ID', 'ro_id'],
    'RO Number': ['RO Number', 'ro_number'],
    'Reference Number': ['Reference Number', 'Reference No', 'Ref No'],
    'Destination Godown': ['Destination Godown', 'dest_loc'],
    'Lifting Target Qty Allocated': ['Lifting Target Qty Allocated', 'Target Qty', 'target_qty'],
    'final_quan_allocated_obj': ['final_quan_allocated_obj', 'Final Qty', 'final_qty']
  },
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
  'first-mile-vehicle-registered': {
    'Sr. No.': ['Sr. No.'],
    'Vehicle Number': ['Vehicle Number', 'Vehicle No', 'Truck Number', 'truck number'],
    'Transporter Name': ['Transporter Name', 'Transporter', 'gps vendor', 'vendor', 'Transport', 'Tran'],
    'District': ['District', 'TP District', 'User Mapping$Branch', 'User_Mapping$Branch', 'branch', 'trans ID', 'trans_id'],
    'Capacity': ['Capacity', 'capacity(mt)', 'truck type']
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
  },
  'penalty-epod': {
    'Reference Number': ['Reference Number', 'Reference No', 'Ref No', 'DC No'],
    'Penalty Hours': ['Penalty Hours', 'Penalty_Hours'],
    'Start_Trip': ['Start_Trip', 'Start Trip', 'Start Trip Time', 'time_of_start_trip'],
    'end_trip': ['end_trip', 'End Trip', 'End_Trip', 'Time of Delivery']
  },
  'last-mile-commodity': {
    'Reference Number': ['Reference Number', 'Reference No', 'Ref No'],
    'LR Number': ['LR Number', 'LR No', 'LR No.'],
    'District': ['District', 'DISTRICT', 'district'],
    'FPS Area ID': ['FPS Area ID', 'FPS AREA ID', 'fps area id'],
    'FPS id': ['FPS id', 'FPS ID', 'fps id'],
    'FPS Name': ['FPS Name', 'FPS NAME', 'fps name'],
    'Commodity': ['Commodity', 'Commodity Name', 'COMMODITY', 'ItemDesc'],
    'Quantity': ['Quantity', 'Qty', 'BilledQty', 'Net Weight'],
    'Transporter Name': ['Transporter Name', 'Transporter', 'transporter name'],
    'Scheme key/Name': ['Scheme key/Name', 'Scheme key', 'Scheme Name'],
    'Scheme name': ['Scheme name', 'Scheme Name'],
    'Scheme Master ID': ['Scheme Master ID', 'Scheme Master Id'],
    'Issue Id': ['Issue Id', 'Issue ID'],
    'Scheme Master Name': ['Scheme Master Name'],
    'Issue Date': ['Issue Date'],
    'Commodity ID/Name': ['Commodity ID/Name'],
    'No. of Bags/ Tin/Carton/Pouch': ['No. of Bags/ Tin/Carton/Pouch', 'No. of Bags'],
    'Bag/Tin/Carton/Pouch weight (in Kg)': ['Bag/Tin/Carton/Pouch weight (in Kg)', 'Bag weight']
  },
  'epod-photo-analysis': {
    'District': ['District', 'District Name', 'TP District', 'Godown District', 'district_name', 'district'],
    'GSCSCL Godown': ['GSCSCL Godown', 'Godown Name', 'Godown', 'Destination Godown', 'Lifting Location Name', 'godown_name', 'godown'],
    'Vehicle': ['Vehicle', 'Vehicle Number', 'Vehicle No', 'Truck Number', 'vehicle_number', 'truck_number', 'Truck No', 'vehicle', 'Truck'],
    'Reference Number': ['Reference Number', 'DC Number', 'Reference No', 'Ref No', 'DC No', 'DC No.', 'Delivery Challan Number', 'Delivery Challan No', 'ref_no', 'dc_no', 'DC', 'Invoice No', 'Invoice Number'],
    'Start Trip Image': ['Start Trip Image', 'Start Trip Photo', 'Start Photo', 'Start Image', 'start_trip_image', 'start_trip_photo', 'Start Trip Photos', 'start trip photo', 'start trip image', 'Start Trip', 'Start Trip Link', 'start_trip_link', 'start_photo', 'start_image'],
    'EPOD Image': ['EPOD Image', 'Delivered Photo', 'Delivered Image', 'Delivered Photos', 'delivered_photo', 'end_trip_image', 'End Trip Image', 'EPOD Photo', 'delivered image', 'Delivered Image', 'epod_image', 'End Trip Image - EPOD', 'EPOD Photos', 'Delivered Photos', 'EPOD Link', 'epod_link', 'End Trip Photo', 'Delivered Link', 'delivered_image', 'epod_photo']
  }
};
