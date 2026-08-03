import re

with open('src/worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update header check to be case-insensitive
header_logic_old = """    const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || [];
    let isValid = true;
    let expectedColumns = '';

    if (activeReport === 'first-mile-epod') {
      if (!headers.includes('EPOD status') && !headers.includes('Reference No') && !headers.includes('Reference Number') && !headers.includes('Tracking')) {
        isValid = false;
        expectedColumns = 'Reference No, EPOD status, TP date';
      }
    } else if (activeReport === 'godown-to-miller') {
      if (!headers.includes('TP District') && !headers.includes('Lifting Location Name')) {
        isValid = false;
        expectedColumns = 'TP District, Lifting Location Name, TP Destination Name';
      }
    } else if (activeReport === 'miller-to-godown') {
      if (!headers.includes('GP Source Name') && !headers.includes('GP Destination Name')) {
        isValid = false;
        expectedColumns = 'GP Source Name, GP Destination Name';
      }
    } else if (activeReport === 'lifting-report') {
      if (!headers.includes('Reference Number') && !headers.includes('District') && !headers.includes('TP Creation Mode')) {
        isValid = false;
        expectedColumns = 'Reference Number, District, TP Creation Mode, Final Quantity Allocated';
      }
    }"""

header_logic_new = """    const headersRaw = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || [];
    const headers = headersRaw.map(h => String(h).trim().toLowerCase());
    let isValid = true;
    let expectedColumns = '';

    if (activeReport === 'first-mile-epod') {
      if (!headers.includes('epod status') && !headers.includes('reference no') && !headers.includes('reference number') && !headers.includes('tracking')) {
        isValid = false;
        expectedColumns = 'Reference No, EPOD status, TP date';
      }
    } else if (activeReport === 'godown-to-miller') {
      if (!headers.includes('tp district') && !headers.includes('lifting location name')) {
        isValid = false;
        expectedColumns = 'TP District, Lifting Location Name, TP Destination Name';
      }
    } else if (activeReport === 'miller-to-godown') {
      if (!headers.includes('gp source name') && !headers.includes('gp destination name')) {
        isValid = false;
        expectedColumns = 'GP Source Name, GP Destination Name';
      }
    } else if (activeReport === 'lifting-report') {
      if (!headers.includes('reference number') && !headers.includes('district') && !headers.includes('tp creation mode')) {
        isValid = false;
        expectedColumns = 'Reference Number, District, TP Creation Mode, Final Quantity Allocated';
      }
    } else if (activeReport === 'last-mile-epod') {
      if (!headers.includes('dc month') && !headers.includes('dc date') && !headers.includes('dc creation date')) {
        isValid = false;
        expectedColumns = 'DC Month, DC Creation Date';
      }
    }"""

content = content.replace(header_logic_old, header_logic_new)

# 2. Update jsonData parsing to getVal logic
get_val_helper = """    const jsonDataRaw = XLSX.utils.sheet_to_json(ws);
    
    // Helper to get value case-insensitively and trim keys
    const getVal = (row, ...keys) => {
        const lowerKeys = keys.map(k => String(k).toLowerCase().trim());
        for (const k in row) {
            if (lowerKeys.includes(String(k).toLowerCase().trim())) {
                return row[k];
            }
        }
        return undefined;
    };
    
    const jsonData = jsonDataRaw;"""

content = content.replace("    const jsonData = XLSX.utils.sheet_to_json(ws);", get_val_helper)

# 3. Replace all row['...'] with getVal(row, '...')
def replace_row_access(match):
    key = match.group(1)
    return f"getVal(row, {key})"

content = re.sub(r"row\[('[^']+')\]", replace_row_access, content)
content = re.sub(r"row\[(\"[^\"]+\")\]", replace_row_access, content)

with open('src/worker.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated worker.js successfully.")
