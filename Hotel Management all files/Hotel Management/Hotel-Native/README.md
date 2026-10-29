# Ajalkar Hotel POS & Billing - React Native Mobile App

हे ॲप्लिकेशन **Ajalkar Hotel Management** साठीचे **React Native (Expo)** मोबाइल व्हर्जन आहे. हे ॲप तुमच्या चालू **Vite (Web)** ॲपसोबतच काम करते आणि तोच डेटा व बॅकएंड API फ्लो शेअर करते.

---

## 📱 वैशिष्ट्ये (Features Included):

1. **Authentication & Session:**
   - Login & Signup स्क्रीन.
   - सुरक्षित मोबाइल टोकन स्टोरेज (`AsyncStorage`).
   - ऑफलाइन आणि ऑनलाइन दोन्ही मोड्समध्ये अखंड काम.

2. **Industry Module Switcher:**
   - **Hotel & Restro** (हॉटेल आणि रेस्टॉरंट).
   - **Cafe & Fast Food** (कॅफे आणि स्नॅक्स).
   - **Mess & Tiffin** (मेस आणि भोजनालय).

3. **Live Tables & Kitchen KOT:**
   - सर्व फ्लोअर सेक्शन्स (AC Dining, Family Hall, Garden Terrace, Roof Top).
   - रिअल-टाइम टेबल स्टेटस (Available, Occupied, Billed, Reserved).
   - मेनूमधून आयटम निवडून थेट किचनला KOT पाठवणे.

4. **GST Billing & Invoice Receipt:**
   - Dine-In आणि Takeaway ऑर्डर्स.
   - CGST (2.5%) + SGST (2.5%) किंवा कस्टम जीएसटी दर.
   - डिस्काउंट आणि राउंड ऑफ (Round Off) कॅल्क्युलेटर.
   - पेमेंट पद्धती (Cash, UPI QR, Card).
   - थर्मल ब्लूटूथ किंवा वाय-फाय प्रिंटरसाठी तयार असलेली GST पावती (Invoice Modal).

5. **Rooms & Lodging Management:**
   - रूम्स ग्रिड, फ्लोअर व्ह्यू आणि दर (Standard, Deluxe, Suite).
   - अतिथी (Guest) Check-In आणि Check-Out.
   - हाउसकीपिंग (Cleaning) स्टेटस.

6. **KPI Reports & GST Summary:**
   - Total Sales, Total Expenses, Net Amount, GST Collected, Received, Pending & Net Cash Flow.
   - गेल्या ५ दिवसांचे सेल्स ऑडिट आणि GSTR-3B कर सारांश.
   - एक्सेल / CSV एक्सपोर्ट पर्याय.

7. **Settings & Backend Connection:**
   - बिलिंग सेटिंग्स (Tax, Discount, Round Off).
   - *Invoice Prefix* व *Invoice Start Number* वापरकर्त्याच्या सूचनेनुसार वगळले आहेत.
   - **Backend Server IP Changer:** मोबाइलवरून तुमच्या लॅपटॉपच्या बॅकएंडशी जोडण्यासाठी सोयीस्कर IP कॉन्फिगरेशन.

---

## 🚀 ॲप कसे सुरू करायचे? (How to Run on Mobile)

### पायरी १: डिपेंडन्सीज इन्स्टॉल करा
प्रोजेक्टच्या फोल्डरमध्ये कमांड प्रॉम्प्ट किंवा पॉवरशेल उघडा आणि टाईप करा:
```bash
npm install
```

### पायरी २: Expo सर्व्हर सुरू करा
```bash
npm start
# किंवा
npx expo start
```

### पायरी ३: तुमच्या मोबाईलवर चालवा
1. गुगल प्ले स्टोअरवरून **Expo Go** ॲप डाउनलोड करा.
2. तुमच्या लॅपटॉप आणि मोबाईल एकाच Wi-Fi शी कनेक्ट करा.
3. टर्मिनलमध्ये दिसणारा **QR Code** मोबाईलच्या कॅमेऱ्याने किंवा Expo Go ॲपमधून स्कॅन करा.
4. ॲप थेट तुमच्या मोबाईलवर सुरू होईल!

---

## 🔄 दोन्ही व्हर्जन्स (Web + Mobile Coexistence):
- **Web App (Vite):** `../Hotel-Billing`
- **Mobile App (React Native):** `../Hotel-Native`
दोन्ही एकाच स्प्रिंग बूट बॅकएंडशी जोडता येतात.
