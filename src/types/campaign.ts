export interface CampaignMetrics {
  campaignName: string;
  eventType: string;
  profileName: string;
  totalCount: number;
  dailyData: Record<string, number>; // date -> count
}

export interface Campaign {
  id: string;
  name: string;
  company?: string;
  profile: string;
  objective?: string;
  cadence?: string;
  positions?: string;
  isActive: boolean;
  metrics: {
    profileVisits: CampaignMetrics;
    connectionRequestsSent: CampaignMetrics;
    messagesSent: CampaignMetrics;
    connectionRequestsAccepted: CampaignMetrics;
    postLikes: CampaignMetrics;
    commentsDone: CampaignMetrics;
    followUps?: CampaignMetrics[];
  };
}

export interface Lead {
  id: string;
  campaign: string;
  linkedin: string;
  name: string;
  position: string;
  company: string;
  status: 'positive' | 'negative' | 'pending';
  source?: string;
  
  // Connection data
  connectionDate?: string;
  
  // Positive lead fields
  positiveResponseDate?: string;
  transferDate?: string;
  statusDetails?: string;
  comments?: string;
  followUp1Date?: string;
  followUp1Comments?: string;
  followUp2Date?: string;
  followUp2Comments?: string;
  followUp3Date?: string;
  followUp3Comments?: string;
  followUp4Date?: string;
  followUp4Comments?: string;
  observations?: string;
  meetingScheduleDate?: string;
  meetingDate?: string;
  proposalDate?: string;
  proposalValue?: number;
  saleDate?: string;
  saleValue?: number;
  profile?: string;
  classification?: string;
  attendedWebinar?: boolean;
  whatsapp?: string;
  standDay?: string;
  pavilion?: string;
  stand?: string;
  
  // Negative lead fields
  negativeResponseDate?: string;
  hadFollowUp?: boolean;
  followUpReason?: string;
}

export interface DailyMetrics {
  date: string;
  isActive: boolean;
  invitationsSent: number;
  connectionsAccepted: number;
  connectionAcceptanceRate: number;
  messagesSent: number;
  visits: number;
  likes: number;
  comments: number;
  totalActivities: number;
  positiveResponses: number;
  leadsProcessed: number;
  meetings: number;
  proposals: number;
  sales: number;
}

export interface WeeklyMetrics extends DailyMetrics {
  startDate: string;
  endDate: string;
  activeDays: number;
}

export interface CampaignAnalytics {
  campaign: Campaign;
  dailyMetrics: DailyMetrics[];
  weeklyMetrics: WeeklyMetrics[];
  totalMetrics: {
    invitationsSent: number;
    profileVisits: number;
    connectionsMade: number;
    likes: number;
    messagesSent: number;
    comments: number;
    positiveResponses: number;
    meetingsScheduled: number;
    proposals: number;
    sales: number;
  };
  conversionRates: {
    positiveResponsesPerInvitation: number;
    positiveResponsesPerConnection: number;
    positiveResponsesPerMessage: number;
    meetingsPerPositiveResponse: number;
    meetingsPerInvitation: number;
  };
  observations?: string;
  technicalIssues?: string;
  searchAdjustments?: string;
  comparativeAnalysis?: string;
}
