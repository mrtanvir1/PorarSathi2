# 📘 পড়ার সাথী

যেকোনো ক্লাসের গণিত বা ইংরেজি প্রশ্ন দিলে ধাপে ধাপে বুঝিয়ে উত্তর দেয়।

## ফাইল
- `index.html` – পুরো অ্যাপের ইন্টারফেস
- `api/solve.js` – সার্ভার-ফাংশন (Claude API-কে ডাকে, key এখানেই থাকে)

## চালু করার নিয়ম (সম্পূর্ণ ফ্রি: Vercel + Google Gemini)
1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) থেকে ফ্রি API key নাও।
2. এই ফোল্ডারটা GitHub-এ একটা নতুন repository-তে আপলোড করো (`solve.js` থাকবে `api/` ফোল্ডারে)।
3. [vercel.com](https://vercel.com)-এ GitHub দিয়ে লগইন করে **Add New → Project** থেকে repository-টা Import করো।
4. **Environment Variables**-এ যোগ করো:
   - Name: `GEMINI_API_KEY`, Value: তোমার key
   - (ঐচ্ছিক) Name: `GEMINI_MODEL` — ফ্রি মডেলের নাম বদলাতে চাইলে। ডিফল্ট `gemini-flash-latest`।
5. **Deploy** চাপো। শেষে যে লিংক পাবে সেটাই অন্যদের দাও।

## সতর্কতা
- API key কখনো `index.html`-এ বা GitHub-এ লিখো না।
- ফ্রি টিয়ারে প্রতি মিনিট/দিনে অনুরোধের সীমা আছে। বেশি মানুষ একসাথে ব্যবহার করলে "একটু বেশি অনুরোধ" বার্তা আসবে।
- ফ্রি টিয়ারে পাঠানো লেখা Google তাদের পণ্য উন্নত করতে ব্যবহার করতে পারে।
- GitHub Pages-এ এটা চলবে না, কারণ সেখানে সার্ভার-ফাংশন নেই।
