// Mock API data for development/testing when real Google Sheets API is not available

const mockData: Record<string, any> = {
  Campaign_Brief: {
    rows: [
      {
        campaignName: "Spring Fashion Campaign",
        clientName: "Luxe Apparel",
        msaBudget: 125000,
        platform: "Instagram",
        contentFormat: "Reel 30-60s",
        postingStartDate: "2026-04-25",
        postingEndDate: "2026-05-15",
        hook: "Showcase your spring style with sustainable fashion",
        cta: "Shop the collection at luxeapparel.com",
        complianceNotes: "FTC disclosure required. No health claims.",
        financialTriggerType: "CC Charged",
        financialTriggerDate: "2026-04-15",
      },
    ],
  },
  Supply_Pipeline: {
    rows: [
      { creatorName: "Sarah Johnson", handle: "@sarahjstyle", pipelineStatus: "Ready to Neg", followers: "245K", offer: "450", sendgridActive: "true", readyToNegotiate: "true", finalBid: "420" },
      { creatorName: "Marcus Chen", handle: "@marcusfashion", pipelineStatus: "Offer In", followers: "189K", offer: "380", sendgridActive: "false", readyToNegotiate: "false", finalBid: "" },
      { creatorName: "Emma Davis", handle: "@emmastyle", pipelineStatus: "Final Bid", followers: "312K", offer: "520", sendgridActive: "true", readyToNegotiate: "true", finalBid: "480" },
      { creatorName: "Alex Rodriguez", handle: "@alexfits", pipelineStatus: "In Pool", followers: "156K", offer: "340", sendgridActive: "true", readyToNegotiate: "false", finalBid: "" },
      { creatorName: "Jessica Park", handle: "@jessicap", pipelineStatus: "Ready to Neg", followers: "298K", offer: "490", sendgridActive: "true", readyToNegotiate: "true", finalBid: "450" },
      { creatorName: "Tyler Brooks", handle: "@tylerb", pipelineStatus: "Stored", followers: "134K", offer: "320", sendgridActive: "false", readyToNegotiate: "false", finalBid: "" },
    ],
  },
  Net_New_Offers: {
    rows: [
      { creatorName: "Sarah Johnson", theirAsk: "500", recRange: "$400–$480", finalOffer: "450", status: "Negotiating", notes: "Counter offer sent" },
      { creatorName: "Marcus Chen", theirAsk: "420", recRange: "$340–$400", finalOffer: "380", status: "Ready to Score", notes: "Accepted" },
      { creatorName: "Emma Davis", theirAsk: "580", recRange: "$460–$540", finalOffer: "520", status: "Pending Review", notes: "" },
      { creatorName: "Alex Rodriguez", theirAsk: "380", recRange: "$300–$360", finalOffer: "340", status: "Ready to Score", notes: "Accepted final offer" },
    ],
  },
  Score_Creators: {
    rows: [
      { creatorName: "Sarah Johnson", handle: "@sarahjstyle", followers: "245K", offer: "450", productionTier: "4", category1: "Fashion", category2: "Lifestyle", category3: "Beauty", contentMatch: "5", audienceFit: "4", notes: "Strong fit", reviewStatus: "Sent to Client", executionPrice: "450", usageRights: "1 year" },
      { creatorName: "Marcus Chen", handle: "@marcusfashion", followers: "189K", offer: "380", productionTier: "3", category1: "Fashion", category2: "Fitness", category3: "Travel", contentMatch: "4", audienceFit: "4", notes: "Good reach", reviewStatus: "Sent to Client", executionPrice: "380", usageRights: "6 months" },
      { creatorName: "Emma Davis", handle: "@emmastyle", followers: "312K", offer: "520", productionTier: "5", category1: "Fashion", category2: "Beauty", category3: "Lifestyle", contentMatch: "5", audienceFit: "5", notes: "Excellent match", reviewStatus: "Sent to Client", executionPrice: "520", usageRights: "1 year" },
      { creatorName: "Alex Rodriguez", handle: "@alexfits", followers: "156K", offer: "340", productionTier: "3", category1: "Fitness", category2: "Fashion", category3: "Wellness", contentMatch: "3", audienceFit: "3", notes: "Moderate fit", reviewStatus: "Pending", executionPrice: "340", usageRights: "6 months" },
    ],
  },
  Campaign_Orders: {
    rows: [
      { creatorName: "Sarah Johnson", price: "450", paymentStatus: "Paid", invoiceDue: "Apr 30", scriptStatus: "Approved", contentStatus: "In Review", creatorNotified: "true", dueDate: "May 5" },
      { creatorName: "Marcus Chen", price: "380", paymentStatus: "Invoiced", invoiceDue: "Apr 28", scriptStatus: "Pending", contentStatus: "Not Started", creatorNotified: "true", dueDate: "May 8" },
      { creatorName: "Emma Davis", price: "520", paymentStatus: "Paid", invoiceDue: "Apr 25", scriptStatus: "Approved", contentStatus: "Delivered", creatorNotified: "true", dueDate: "May 3" },
      { creatorName: "Alex Rodriguez", price: "340", paymentStatus: "Unpaid", invoiceDue: "May 2", scriptStatus: "Draft", contentStatus: "Not Started", creatorNotified: "false", dueDate: "May 10" },
      { creatorName: "Jessica Park", price: "490", paymentStatus: "Overdue", invoiceDue: "Apr 20", scriptStatus: "Approved", contentStatus: "In Progress", creatorNotified: "true", dueDate: "May 6" },
    ],
  },
};

export async function fetchSheetData(sheetId: string, tab: string): Promise<any> {
  // For development, directly return mock data
  // In production, this would make a real API call
  return Promise.resolve(mockData[tab] || { rows: [] });
}
