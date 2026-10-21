/**
 * templates.js - Event templates, budget weights, and task skeletons for Utsav
 *
 * Covers wedding, birthday, and community event types.
 * All default budget weights sum to exactly 100.
 */

export const EVENT_TYPES = {
  WEDDING: "wedding",
  BIRTHDAY: "birthday",
  COMMUNITY: "community"
};

export const TEMPLATES = {
  [EVENT_TYPES.WEDDING]: {
    type: EVENT_TYPES.WEDDING,
    label: "Wedding Celebration",
    tagline: "A beautiful multi-day celebration of love, family, and tradition",
    defaultWeights: [
      { id: "venue", name: "Venue & Hospitality", weight: 31 },
      { id: "catering", name: "Catering & Bar", weight: 26 },
      { id: "decor", name: "Decor, Floral & Stage", weight: 18 },
      { id: "photography", name: "Photography & Videography", weight: 12 },
      { id: "attire", name: "Attire, Jewellery & Styling", weight: 8 },
      { id: "entertainment", name: "DJ, Sound & Entertainment", weight: 5 }
    ],
    subEvents: [
      { id: "mehendi_haldi", title: "Haldi & Mehendi", desc: "Vibrant daytime rituals with floral decor and folk music" },
      { id: "sangeet", title: "Sangeet & Cocktails", desc: "Evening dance performances, DJ, and family celebrations" },
      { id: "wedding_ceremony", title: "Main Wedding Ceremony", desc: "Traditional rituals, sacred vows, and auspicious blessings" },
      { id: "reception", title: "Grand Reception", desc: "Formal feast, speeches, and welcoming guests" }
    ],
    vendorCategories: [
      { id: "venue", name: "Venue", bookWeeksBefore: 24, icon: "building" },
      { id: "catering", name: "Caterer", bookWeeksBefore: 20, icon: "utensils" },
      { id: "photography", name: "Photographer", bookWeeksBefore: 20, icon: "camera" },
      { id: "decor", name: "Decor & Floral Designer", bookWeeksBefore: 16, icon: "sparkles" },
      { id: "attire", name: "Bridal & Groom Wear", bookWeeksBefore: 12, icon: "shirt" },
      { id: "makeup", name: "Hair & Makeup Artist", bookWeeksBefore: 12, icon: "smile" },
      { id: "entertainment", name: "DJ & Sound", bookWeeksBefore: 8, icon: "music" },
      { id: "invites", name: "Invitations & Stationery", bookWeeksBefore: 10, icon: "mail" },
      { id: "mehendi", name: "Mehendi Artist", bookWeeksBefore: 8, icon: "hand" }
    ],
    milestones: [
      {
        id: "m_venue_vendors",
        title: "Secure Venue & Core Creative Team",
        weeksBefore: 24,
        tasks: [
          "Finalise guest count estimate and target budget",
          "Shortlist and visit top 3 candidate venues",
          "Book wedding venue and sign contract with date lock",
          "Lock lead photographer and cinematic videographer"
        ]
      },
      {
        id: "m_decor_catering",
        title: "Catering Menus & Decor Conceptualization",
        weeksBefore: 16,
        tasks: [
          "Schedule food tasting session with chosen caterer",
          "Finalise multi-event menu spread and live counters",
          "Review decor moodboard and colour palettes per function",
          "Send Save-the-Date digital announcements to VIP guests"
        ]
      },
      {
        id: "m_attire_invites",
        title: "Attire, Styling & Formal Invitations",
        weeksBefore: 10,
        tasks: [
          "Finalise bridal and groom ceremony attire and fittings",
          "Confirm hair and makeup artist with trial booking",
          "Print/send formal invitations with RSVP deadline",
          "Book DJ, anchor, and sound/light production setup"
        ]
      },
      {
        id: "m_guest_logistics",
        title: "Guest Logistics & Final Confirmations",
        weeksBefore: 4,
        tasks: [
          "Follow up on pending RSVPs and freeze expected headcount",
          "Allocate room blocks and airport transport for out-of-town guests",
          "Finalise day-of minute-by-minute itinerary",
          "Confirm vendor arrival timings and deliver deposit milestones"
        ]
      },
      {
        id: "m_final_week",
        title: "Final Rehearsals & Emergency Kit",
        weeksBefore: 1,
        tasks: [
          "Conduct ceremony rehearsal with family and bridal party",
          "Pack bridal emergency kit (safety pins, sewing kit, stain remover)",
          "Reconfirm final guest headcount with caterer",
          "Hand over vendor coordination contacts to a trusted point of contact"
        ]
      },
      {
        id: "m_wedding_day",
        title: "The Wedding Day!",
        weeksBefore: 0,
        tasks: [
          "Relax, stay hydrated, and soak in every moment",
          "Vendor arrivals sign-in and green room access",
          "Family photography session before ceremony starts",
          "Enjoy the feast and festivities!"
        ]
      }
    ]
  },

  [EVENT_TYPES.BIRTHDAY]: {
    type: EVENT_TYPES.BIRTHDAY,
    label: "Milestone Birthday Party",
    tagline: "A memorable celebration packed with laughter, friends, and special moments",
    defaultWeights: [
      { id: "catering", name: "Catering, Cake & Drinks", weight: 35 },
      { id: "venue", name: "Venue / Space Hire", weight: 25 },
      { id: "entertainment", name: "Entertainment, Host & Games", weight: 15 },
      { id: "decor", name: "Themed Decor & Balloons", weight: 15 },
      { id: "photography", name: "Photography & Keepsakes", weight: 10 }
    ],
    subEvents: [
      { id: "welcome_drinks", title: "Welcome Drinks & Mingling", desc: "Arrivals, polaroid guestbook, and appetizers" },
      { id: "games_activity", title: "Games & Entertainment", desc: "Interactive games, trivia, or live performer" },
      { id: "cake_cutting", title: "Cake Cutting Ceremony", desc: "Celebratory cake cutting, toasts, and group photos" },
      { id: "dinner_party", title: "Dinner & Dancing", desc: "Main meal, dessert station, and open dance floor" }
    ],
    vendorCategories: [
      { id: "venue", name: "Party Venue / Hall", bookWeeksBefore: 8, icon: "building" },
      { id: "catering", name: "Catering & Bartending", bookWeeksBefore: 6, icon: "utensils" },
      { id: "baker", name: "Custom Cake Designer", bookWeeksBefore: 4, icon: "cake" },
      { id: "decor", name: "Balloons & Backdrop Decor", bookWeeksBefore: 4, icon: "sparkles" },
      { id: "entertainment", name: "DJ / Performer / Games Host", bookWeeksBefore: 4, icon: "music" },
      { id: "photography", name: "Party Photographer", bookWeeksBefore: 3, icon: "camera" }
    ],
    milestones: [
      {
        id: "m_concept_venue",
        title: "Theme & Venue Booking",
        weeksBefore: 8,
        tasks: [
          "Pick party theme (e.g. Retro Disco, Elegant Golden, Tropical)",
          "Draft initial guest list and set spending budget",
          "Book party venue or private dining room"
        ]
      },
      {
        id: "m_caterer_cake",
        title: "Food, Cake & Invites",
        weeksBefore: 4,
        tasks: [
          "Design and send digital invitations with RSVP date",
          "Order custom showstopper birthday cake",
          "Confirm party appetizers, signature mocktails/cocktails, and dinner menu",
          "Book DJ or games facilitator"
        ]
      },
      {
        id: "m_decor_partyware",
        title: "Decor, Music & Party Favours",
        weeksBefore: 2,
        tasks: [
          "Order personalised photo backdrop and balloon arch",
          "Curate birthday music playlist",
          "Assemble return gifts or party favours",
          "Track RSVPs and confirm attendance"
        ]
      },
      {
        id: "m_birthday_party",
        title: "Party Day!",
        weeksBefore: 0,
        tasks: [
          "Pick up cake or supervise bakery delivery",
          "Setup decor and check sound equipment",
          "Welcome guests and celebrate!"
        ]
      }
    ]
  },

  [EVENT_TYPES.COMMUNITY]: {
    type: EVENT_TYPES.COMMUNITY,
    label: "Community Event & Festival",
    tagline: "An impactful gathering bringing people together with culture, food, and activities",
    defaultWeights: [
      { id: "venue_logistics", name: "Venue, Tents & Logistics", weight: 30 },
      { id: "catering", name: "Food Stalls & Refreshments", weight: 25 },
      { id: "av_stage", name: "Audio, Stage & Lighting", weight: 20 },
      { id: "decor_signage", name: "Signage, Banners & Decor", weight: 10 },
      { id: "permits_security", name: "Permits, Safety & Sanitation", weight: 10 },
      { id: "marketing", name: "Outreach & Volunteer Kits", weight: 5 }
    ],
    subEvents: [
      { id: "inauguration", title: "Opening Ceremony", desc: "Welcome address, lamp lighting, and keynote remarks" },
      { id: "performances", title: "Cultural & Stage Program", desc: "Community performances, talks, and awards" },
      { id: "community_feast", title: "Community Feast / Food Fest", desc: "Shared dining, food stalls, and community mingling" }
    ],
    vendorCategories: [
      { id: "venue", name: "Ground / Hall Authorities", bookWeeksBefore: 12, icon: "building" },
      { id: "av_stage", name: "AV, Stage & PA System", bookWeeksBefore: 8, icon: "mic" },
      { id: "catering", name: "Community Food Vendor / Caterer", bookWeeksBefore: 8, icon: "utensils" },
      { id: "tents_furniture", name: "Tents, Chairs & Generators", bookWeeksBefore: 6, icon: "tent" },
      { id: "security", name: "Security & First Aid Services", bookWeeksBefore: 4, icon: "shield" },
      { id: "printing", name: "Banners & Wayfinding Signs", bookWeeksBefore: 3, icon: "printer" }
    ],
    milestones: [
      {
        id: "m_permits_venue",
        title: "Permits, Approvals & Space Lock",
        weeksBefore: 12,
        tasks: [
          "Submit municipal and sound permits",
          "Book public ground, auditorium, or clubhouse",
          "Draft sponsor deck and community fundraising goal"
        ]
      },
      {
        id: "m_vendors_infrastructure",
        title: "Infrastructure & Volunteer Recruitment",
        weeksBefore: 6,
        tasks: [
          "Book generator, stage rigging, and sound engineers",
          "Lock food vendors or community catering contract",
          "Hold volunteer orientation meeting and assign team leads",
          "Publish community flyer and registration link"
        ]
      },
      {
        id: "m_safety_schedules",
        title: "Safety, Sanitation & Timelines",
        weeksBefore: 2,
        tasks: [
          "Inspect emergency exits, fire extinguishers, and first aid booth",
          "Print entry badges, schedule flyers, and directional signs",
          "Confirm water stations, waste segregation, and restrooms",
          "Send reminder blast to registered attendees"
        ]
      },
      {
        id: "m_event_execution",
        title: "Event Day & Clean-Up",
        weeksBefore: 0,
        tasks: [
          "Early morning grounds walkthrough and sound check",
          "Brief volunteer marshals at control desk",
          "Execute event schedule and manage stage flow",
          "Supervise post-event clean-up and vendor load-out"
        ]
      }
    ]
  }
};

/**
 * Get template for an event type with fallback to wedding
 * @param {string} type
 * @returns {typeof TEMPLATES['wedding']}
 */
export function getEventTemplate(type) {
  const normalized = (type || "").toLowerCase();
  return TEMPLATES[normalized] || TEMPLATES[EVENT_TYPES.WEDDING];
}
