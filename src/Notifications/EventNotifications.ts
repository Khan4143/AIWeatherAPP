import notifee, { TriggerType, AndroidImportance, TimestampTrigger } from '@notifee/react-native';
import { Platform } from 'react-native';
import { format, parse, subMinutes } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for planned events
interface PlannedEvent {
  id: string;
  activity: string;
  description: string;
  date: string;
  time: string;
  duration: string;
}

/**
 * Schedule a notification for an event that will trigger 5 minutes before the event starts
 */
export const scheduleEventNotification = async (event: PlannedEvent): Promise<string | null> => {
  try {
    // Parse the date and time from the event
    const dateString = event.date;
    const timeString = event.time;
    
    // Extract date components
    let dateToUse: Date;
    if (dateString.includes('Today')) {
      dateToUse = new Date();
    } else if (dateString.includes('Tomorrow')) {
      dateToUse = new Date();
      dateToUse.setDate(dateToUse.getDate() + 1);
    } else {
      // Format is like "Monday, Jan 1" or "Tuesday, Feb 2"
      const parts = dateString.split(', ');
      if (parts.length < 2) {
        console.error('❌ Invalid date format:', dateString);
        return null;
      }
      
      const monthDay = parts[1];
      const currentYear = new Date().getFullYear();
      const fullDateStr = `${monthDay} ${currentYear}`;
      
      // Parse the date string
      dateToUse = parse(fullDateStr, 'MMM d yyyy', new Date());
    }
    
    // Parse the time (format: "1:00 PM" or "12:30 AM")
    const timeParts = timeString.match(/(\d+):(\d+)\s+(AM|PM)/i);
    if (!timeParts) {
      console.error('❌ Invalid time format:', timeString);
      return null;
    }
    
    let hours = parseInt(timeParts[1], 10);
    const minutes = parseInt(timeParts[2], 10);
    const isPM = timeParts[3].toUpperCase() === 'PM';
    
    // Convert to 24-hour format
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    
    // Set the time on our date object
    dateToUse.setHours(hours, minutes, 0, 0);
    
    // Calculate the notification time (5 minutes before the event)
    const notificationTime = subMinutes(dateToUse, 5);
    
    // Don't schedule notifications in the past
    const now = new Date();
    if (notificationTime <= now) {
      console.log('⚠️ Event time is in the past or too soon, not scheduling notification');
      return null;
    }
    
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
      id: 'event-reminders',
      name: 'Event Reminders',
      importance: AndroidImportance.HIGH,
    });
    
    // Create the trigger
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: notificationTime.getTime(),
    };
    
    // Create the notification
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
    
    console.log(`✅ Scheduled notification for event ${event.id} at ${format(notificationTime, 'yyyy-MM-dd HH:mm:ss')}`);
    return notificationId;
  } catch (error) {
    console.error('❌ Failed to schedule event notification:', error);
    return null;
  }
};

/**
 * Cancel a scheduled notification for an event
 */
export const cancelEventNotification = async (eventId: string): Promise<void> => {
  try {
    await notifee.cancelNotification(`event-${eventId}`);
    console.log(`✅ Cancelled notification for event ${eventId}`);
  } catch (error) {
    console.error('❌ Failed to cancel event notification:', error);
  }
};

/**
 * Cancel and reschedule a notification for an updated event
 */
export const updateEventNotification = async (event: PlannedEvent): Promise<string | null> => {
  // First cancel the existing notification
  await cancelEventNotification(event.id);
  
  // Then schedule a new one
  return scheduleEventNotification(event);
};

/**
 * Reschedule all notifications for planned events
 * Call this when the app starts to ensure notifications persist
 */
export const rescheduleAllEventNotifications = async (): Promise<void> => {
  try {
    // Load all planned events from storage
    const eventsJson = await AsyncStorage.getItem('plannedEvents');
    if (!eventsJson) {
      console.log('ℹ️ No planned events found to reschedule');
      return;
    }
    
    // Parse the events
    const events: PlannedEvent[] = JSON.parse(eventsJson);
    console.log(`🔄 Rescheduling notifications for ${events.length} events`);
    
    // Cancel all existing notifications first
    await notifee.cancelAllNotifications();
    
    // Schedule notifications for each event
    let scheduledCount = 0;
    for (const event of events) {
      const notificationId = await scheduleEventNotification(event);
      if (notificationId) {
        scheduledCount++;
      }
    }
    
    console.log(`✅ Successfully rescheduled ${scheduledCount} notifications`);
  } catch (error) {
    console.error('❌ Failed to reschedule event notifications:', error);
  }
}; 