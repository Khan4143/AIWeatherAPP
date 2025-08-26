import notifee, { TriggerType, AndroidImportance, TimestampTrigger } from '@notifee/react-native';
import { Platform } from 'react-native';
import { format, parse, subMinutes } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlannedEvent {
  id: string;
  activity: string;
  description: string;
  date: string;
  time: string;
  duration: string;
}
export const scheduleEventNotification = async (event: PlannedEvent): Promise<string | null> => {
  try {
    const dateString = event.date;
    const timeString = event.time;
    let dateToUse: Date;
    if (dateString.includes('Today')) {
      dateToUse = new Date();
    } else if (dateString.includes('Tomorrow')) {
      dateToUse = new Date();
      dateToUse.setDate(dateToUse.getDate() + 1);
    } else {
      const parts = dateString.split(', ');
      if (parts.length < 2) {
        return null;
      }
      
      const monthDay = parts[1];
      const currentYear = new Date().getFullYear();
      const fullDateStr = `${monthDay} ${currentYear}`;
      
      dateToUse = parse(fullDateStr, 'MMM d yyyy', new Date());
    }
    
    const timeParts = timeString.match(/(\d+):(\d+)\s+(AM|PM)/i);
    if (!timeParts) {
      return null;
    }
    
    let hours = parseInt(timeParts[1], 10);
    const minutes = parseInt(timeParts[2], 10);
    const isPM = timeParts[3].toUpperCase() === 'PM';
    
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    
    dateToUse.setHours(hours, minutes, 0, 0);
    
    const notificationTime = subMinutes(dateToUse, 5);
    
    const now = new Date();
    if (notificationTime <= now) {
      return null;
    }
    
    const channelId = await notifee.createChannel({
      id: 'event-reminders',
      name: 'Event Reminders',
      importance: AndroidImportance.HIGH,
    });
    
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: notificationTime.getTime(),
    };
    const notificationId = await notifee.createTriggerNotification(
      {
        id: `event-${event.id}`,
        title: `${event.activity} - Starting Soon`,
        body: `Your event "${event.description}" is starting in 5 minutes`,
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
        data: {
          eventId: event.id,
          type: 'event_reminder',
        },
      },
      trigger,
    );
    
    return notificationId;
  } catch (error) {
    return null;
  }
};


export const cancelEventNotification = async (eventId: string): Promise<void> => {
  try {
    await notifee.cancelNotification(`event-${eventId}`);
  } catch (error) {
  }
};


export const updateEventNotification = async (event: PlannedEvent): Promise<string | null> => {
  await cancelEventNotification(event.id);
  
  return scheduleEventNotification(event);
};


export const rescheduleAllEventNotifications = async (): Promise<void> => {
  try {
    const eventsJson = await AsyncStorage.getItem('plannedEvents');
    if (!eventsJson) {
      return;
    }
    
    const events: PlannedEvent[] = JSON.parse(eventsJson);
    
    await notifee.cancelAllNotifications();
    
    let scheduledCount = 0;
    for (const event of events) {
      const notificationId = await scheduleEventNotification(event);
      if (notificationId) {
        scheduledCount++;
      }
    }
  } catch (error) {
  }
}; 