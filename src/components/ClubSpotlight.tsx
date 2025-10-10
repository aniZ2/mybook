'use client';

import React from 'react';
import styles from './Club.module.css';
import { Calendar, Megaphone, Clock, MapPin } from 'lucide-react';

type Event = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  date: string;
};

export default function ClubSpotlight({ 
  events, 
  announcements 
}: { 
  events?: Event[];
  announcements?: Announcement[];
}) {
  const hasContent = (events && events.length > 0) || (announcements && announcements.length > 0);
  
  if (!hasContent) return null;

  return (
    <div className={styles.spotlightContainer}>
      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <section className={styles.spotlight}>
          <h2 className={styles.spotlightHeading}>
            <Megaphone size={20} />
            Club Announcements
          </h2>
          <div className={styles.announcementsList}>
            {announcements.slice(0, 3).map((announcement) => (
              <div key={announcement.id} className={styles.announcementCard}>
                <div className={styles.announcementHeader}>
                  <h4 className={styles.announcementTitle}>{announcement.title}</h4>
                  <time className={styles.announcementDate}>
                    {new Date(announcement.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </time>
                </div>
                <p className={styles.announcementMessage}>{announcement.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {events && events.length > 0 && (
        <section className={styles.spotlight}>
          <h2 className={styles.spotlightHeading}>
            <Calendar size={20} />
            Upcoming Events
          </h2>
          <div className={styles.eventsList}>
            {events.slice(0, 3).map((event) => (
              <div key={event.id} className={styles.eventCard}>
                <div className={styles.eventDate}>
                  <div className={styles.eventDay}>
                    {new Date(event.date).getDate()}
                  </div>
                  <div className={styles.eventMonth}>
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
                <div className={styles.eventDetails}>
                  <h4 className={styles.eventTitle}>{event.title}</h4>
                  <div className={styles.eventMeta}>
                    {event.time && (
                      <span className={styles.eventMetaItem}>
                        <Clock size={14} />
                        {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className={styles.eventMetaItem}>
                        <MapPin size={14} />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}