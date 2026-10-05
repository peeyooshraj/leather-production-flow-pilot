export const fixture = {
  name: "Simulation Fixture 001 — leather-goods production",
  disclaimer: "Synthetic training data only. Not real factory production data.",
  order: { reference: "DEMO-101", style: "Ladies leather handbag", target: 500 },
  operations: ["Cutting", "Skiving", "Preparation", "Stitching", "Assembly", "Finishing"],
  intervals: ["09–10", "10–11", "11–12", "12–13"],
  observations: {
    Cutting:      [[78,18],[76,17],[75,16],[77,18]],
    Skiving:      [[70,22],[69,24],[68,27],[69,29]],
    Preparation:  [[66,28],[64,31],[42,49],[65,41]],
    Stitching:    [[62,31],[54,56],[47,92],[45,126]],
    Assembly:     [[60,24],[55,15],[43,7],[31,3]],
    Finishing:    [[58,20],[54,14],[40,6],[27,2]]
  },
  events: [
    { id: "E1", operation: "Preparation", category: "MATERIAL", start: "2026-10-05T10:18:00", end: "2026-10-05T10:45:00", condition: "Component unavailable" },
    { id: "E2", operation: "Stitching", category: "MACHINE", start: "2026-10-05T11:10:00", end: "2026-10-05T11:40:00", condition: "Machine unavailable" },
    { id: "E3", operation: "Stitching", category: "MATERIAL", start: "2026-10-05T11:25:00", end: "2026-10-05T11:55:00", condition: "Component unavailable" }
  ],
  quality: { inspected: 450, firstPassGood: 436, failed: 14, recovered: 10, rejected: 4, inRework: 0 }
};
