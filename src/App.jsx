import crc16ccitt from "crc/calculators/crc16ccitt";
import throttle from "lodash/throttle";
import React, { useEffect, useRef, useState } from "react";
import { QRCode } from "react-qrcode-logo";

import "./App.css";

function App() {
  const [mode, setMode] = useState("phone");
  const [target, setTarget] = useState(localStorage.getItem("phone") || "");
  const [reference, setReference] = useState("");
  const [entityName, setEntityName] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const logoRef = useRef(null);

  class QRData {
    constructor(components) {
      this.components = components;
    }

    toString() {
      return Object.entries(this.components)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
          if (!/^[0-9]{2}$/.test(key))
            throw new Error("Key should be a 2-digit numeric key code");
          if (value === null) return "";
          const encodedValue =
            typeof value === "string" ? value : value.toString();
          if (encodedValue.length > 99)
            throw new Error("Encoded length should not exceed 99!");
          return `${key}${encodedValue.length
            .toString()
            .padStart(2, "0")}${encodedValue}`;
        })
        .join("");
    }

    toStringWithCRC() {
      const result = this.toString() + "6304";
      const rcode = crc16ccitt(new TextEncoder().encode(result))
        .toString(16)
        .padStart(4, "0")
        .toUpperCase();
      return result + rcode;
    }
  }

  const standardizePhone = (s) => {
    if (mode !== "phone") return s;
    return /^[0-9]{8}$/.test(s) ? `+65${s}` : s;
  };

  const generateQRCodeData = throttle(() => {
    const finalTarget = standardizePhone(target);

    // prettier-ignore
    const data = new QRData({
      "00": "01",                                                 // ID 00: Payload Format Indicator (Fixed to '01')
      "01": "11",                                                 // ID 01: Point of Initiation Method 11: static, 12: dynamic
      26: new QRData({                                            // ID 26: Merchant Account Info Template
        "00": "SG.PAYNOW",
        "01": mode === "phone" ? "0" : "2",                           // 0 for mobile, 2 for UEN. 1 is not used.
        "02": finalTarget,                                            // PayNow UEN (Company Unique Entity Number) / Phone Number
        "03": "1",                                                    // 1 = Payment amount is editable, 0 = Not Editable
      }),
      52: "0000",                                                 // ID 52: Merchant Category Code (not used)
      53: "702",                                                  // ID 53: Currency. SGD is 702
      58: "SG",                                                   // ID 58: 2-letter Country Code (SG)
      59: "NA",                                                   // ID 59: Company Name
      60: "Singapore",                                            // ID 60: Merchant City
      62: new QRCode({                                            // ID 62: Additional data fields
        "01": mode === "uen" ? reference || null : null,              // ID 01: Bill Number
      })
    }).toStringWithCRC();

    localStorage.setItem("phone", target);
    setQrCodeData(data);
  }, 500);

  useEffect(() => {
    generateQRCodeData();
  }, [mode, target, reference]);

  return (
    <div className="container">
      <div className="no-print">
        <header>
          <h1>PayNow QR Code Generator</h1>
        </header>
        <main>
          <div className="description">
            Generate a QR for your phone number or UEN and print it out!
          </div>
          <div className="field">
            <h4>PayNow destination type</h4>
            <label>
              <input
                type="radio"
                checked={mode === "phone"}
                onChange={() => setMode("phone")}
              />{" "}
              Phone number
            </label>
            <label>
              <input
                type="radio"
                checked={mode === "uen"}
                onChange={() => setMode("uen")}
              />{" "}
              UEN
            </label>
          </div>
          <div className="field">
            <h4>{mode === "phone" ? "Phone" : "UEN"}</h4>
            <input
              type={mode === "phone" ? "tel" : "text"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div className="field">
            <h4>Company Name / Person Name</h4>
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
            />
          </div>
          {mode === "uen" && (
            <div className="field">
              <h4>Transaction Reference</h4>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          <button onClick={() => window.print()}>Print</button>
        </main>
        <footer>
          <h2>References</h2>
          <ol>
            <li>
              <a href="https://www.emvco.com/specifications/emv-qr-code-specification-for-payment-systems-emv-qrcps-merchant-presented-mode/">
                EMV QR Code Specification for Payment Systems
              </a>
            </li>
            <li>
              <a href="https://www.fullstacksys.com/paynow-qr-code-generator">
                Fullstacksys.com PayNow QR Code Generator
              </a>
            </li>
            <li>
              Singapore QR Codes for Payments ("SGQR") Specifications v1.7
            </li>
          </ol>
        </footer>
      </div>
      <div id="sample">
        <h4 className="no-print">Sample</h4>
        <h2>Scan this QR code to pay!</h2>
        <div>{qrCodeData && <QRCode value={qrCodeData} size={250} />}</div>
        {entityName !== "" && (
          <div>
            <hr />
            <h3>{entityName}</h3>
            <hr />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
