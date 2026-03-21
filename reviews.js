// ============================================================
//  Taskboost.ai — reviews.js
//  Approved customer reviews.
//
//  HOW TO ADD A NEW REVIEW:
//  1. You receive an email with the review details.
//  2. Copy the template below, fill in the fields, and add it
//     to the window.APPROVED_REVIEWS array.
//  3. git add reviews.js && git commit -m "add review" && git push
//     → Vercel deploys automatically in ~30 seconds.
//
//  TEMPLATE:
//  {
//    name: "Full Name",
//    company: "Company Name",       // optional
//    role: "CEO",                   // optional
//    stars: 5,                      // 1–5
//    text: "Review text here...",
//    date: "2026-03"                // YYYY-MM
//  },
// ============================================================

window.APPROVED_REVIEWS = [

  {
    name: "Floribeth Elizondo",
    company: "Residencias Costa Rica",
    role: "CEO",
    stars: 5,
    text: "Working with TaskBoost.ai completely transformed our business. They built our website and implemented a fully automated WhatsApp system that handles inquiries, bookings, and scheduling 24/7. Our response times improved dramatically, and our team can now focus entirely on our clients. Highly recommended.",
    date: "2026-03",
    id: "1774134919025"
  },
];