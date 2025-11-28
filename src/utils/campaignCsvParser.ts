import Papa from 'papaparse';

export interface CampaignCsvRow {
  'Campaign Name': string;
  'Event Type': string;
  'Profile Name': string;
  'Total Count': string;
  [date: string]: string; // Dynamic date columns like "2025-08-05"
}

export interface ParsedCampaignData {
  profileName: string;
  campaignName: string;
  metrics: {
    eventType: string;
    totalCount: number;
    dailyData: Record<string, number>; // date -> count
  }[];
  dateRange: {
    startDate: string;
    endDate: string;
    activeDays: number;
  };
}

const EVENT_TYPES = [
  'Profile Visits',
  'Connection Requests Sent',
  'Messages Sent',
  'Connection Requests Accepted',
  'Post Likes',
  'Comments Done',
  'Follow-Ups 1',
  'Follow-Ups 2',
  'Follow-Ups 3',
];

export function parseCampaignCsv(csvContent: string): ParsedCampaignData[] {
  console.log('🔍 Starting campaign CSV parsing...');
  
  const parseResult = Papa.parse<CampaignCsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parseResult.errors.length > 0) {
    console.error('❌ CSV parsing errors:', parseResult.errors);
    throw new Error('Failed to parse CSV file');
  }

  const rows = parseResult.data;
  console.log(`📊 Parsed ${rows.length} rows from CSV`);

  // Group by Profile Name and Campaign Name
  const groupedData = new Map<string, ParsedCampaignData>();

  rows.forEach((row, index) => {
    const profileName = row['Profile Name']?.trim();
    const campaignName = row['Campaign Name']?.trim();
    const eventType = row['Event Type']?.trim();
    const totalCount = parseFloat(row['Total Count'] || '0');

    if (!profileName || !campaignName || !eventType) {
      console.warn(`⚠️ Row ${index + 1} missing required fields, skipping`);
      return;
    }

    // Skip excluded campaigns
    const excludedCampaigns = ['Campanha 0', 'Campaign 0', 'Sent manually'];
    if (excludedCampaigns.some(excluded => 
      campaignName.toLowerCase().includes(excluded.toLowerCase())
    )) {
      console.log(`⏭️ Skipping excluded campaign: ${campaignName}`);
      return;
    }

    // Create unique key for profile + campaign
    const key = `${profileName}|||${campaignName}`;

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        profileName,
        campaignName,
        metrics: [],
        dateRange: {
          startDate: '',
          endDate: '',
          activeDays: 0,
        },
      });
    }

    const data = groupedData.get(key)!;

    // Extract daily data from date columns
    const dailyData: Record<string, number> = {};
    const dateColumns: string[] = [];

    Object.keys(row).forEach((key) => {
      // Check if column is a date (YYYY-MM-DD format)
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const value = parseFloat(row[key] || '0');
        if (!isNaN(value)) {
          dailyData[key] = value;
          dateColumns.push(key);
        }
      }
    });

    // Update date range
    if (dateColumns.length > 0) {
      const sortedDates = dateColumns.sort();
      if (!data.dateRange.startDate || sortedDates[0] < data.dateRange.startDate) {
        data.dateRange.startDate = sortedDates[0];
      }
      if (!data.dateRange.endDate || sortedDates[sortedDates.length - 1] > data.dateRange.endDate) {
        data.dateRange.endDate = sortedDates[sortedDates.length - 1];
      }
      
      // Count active days (days with any data)
      const activeDaysSet = new Set(dateColumns);
      data.dateRange.activeDays = Math.max(data.dateRange.activeDays, activeDaysSet.size);
    }

    // Add metric
    data.metrics.push({
      eventType,
      totalCount,
      dailyData,
    });

    console.log(`✅ Processed ${eventType} for ${campaignName} (${profileName}): ${dateColumns.length} days`);
  });

  const result = Array.from(groupedData.values());
  console.log(`✨ Parsed ${result.length} unique campaign-profile combinations`);
  
  return result;
}

export function calculateCampaignMetrics(data: ParsedCampaignData) {
  const getMetricTotal = (eventType: string): number => {
    const metric = data.metrics.find(m => m.eventType === eventType);
    return metric?.totalCount || 0;
  };

  const invitationsSent = getMetricTotal('Connection Requests Sent');
  const connectionsAccepted = getMetricTotal('Connection Requests Accepted');
  const profileVisits = getMetricTotal('Profile Visits');
  const likes = getMetricTotal('Post Likes');
  const comments = getMetricTotal('Comments Done');
  const followUps1 = getMetricTotal('Follow-Ups 1');
  const followUps2 = getMetricTotal('Follow-Ups 2');
  const followUps3 = getMetricTotal('Follow-Ups 3');
  
  // Messages sent should count only follow-ups
  const messagesSent = followUps1 + followUps2 + followUps3;

  const totalActivities = profileVisits + invitationsSent + messagesSent + 
                         likes + comments;

  const acceptanceRate = invitationsSent > 0 
    ? (connectionsAccepted / invitationsSent) * 100 
    : 0;

  return {
    startDate: data.dateRange.startDate,
    endDate: data.dateRange.endDate,
    activeDays: data.dateRange.activeDays,
    invitationsSent,
    connectionsAccepted,
    acceptanceRate,
    messagesSent,
    profileVisits,
    likes,
    comments,
    totalActivities,
    followUps1,
    followUps2,
    followUps3,
  };
}
