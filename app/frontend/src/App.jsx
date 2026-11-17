import React, { useEffect, useState, useMemo } from 'react';

// Category helpers
function getEventCategory(title = '') {
  const t = title.toLowerCase();
  if (t.includes('hack') || t.includes('code') || t.includes('dev')) {
    return { name: 'Tech & Hackathon', tagClass: 'tech' };
  }
  if (t.includes('career') || t.includes('fair') || t.includes('network') || t.includes('job')) {
    return { name: 'Career & Networking', tagClass: 'career' };
  }
  if (t.includes('robot') || t.includes('demo') || t.includes('stem') || t.includes('eng')) {
    return { name: 'Robotics & STEM', tagClass: 'stem' };
  }
  return { name: 'Campus Life', tagClass: 'tech' };
}

function getEventDescription(title = '') {
  const t = title.toLowerCase();
  if (t.includes('hack')) {
    return 'Collaborate with fellow campus innovators, build cutting-edge software solutions overnight, and pitch to industry judges.';
  }
  if (t.includes('career')) {
    return 'Meet top campus recruiters, explore summer internships and full-time engineering roles, and network with university alumni.';
  }
  if (t.includes('robot')) {
    return 'Live engineering demonstrations, autonomous vehicle testing, and hardware robotics challenges presented by student teams.';
  }
  return 'Join fellow students and campus organizers for this official university event with interactive sessions and community networking.';
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'my-registrations'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [healthStatus, setHealthStatus] = useState({ ok: true, checking: true });

  // Modals state
  const [registerEvent, setRegisterEvent] = useState(null);
  const [uploadEvent, setUploadEvent] = useState(null);

  // Form states
  const [regForm, setRegForm] = useState({ name: '', email: '' });
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Local student registrations persistence
  const [myRegistrations, setMyRegistrations] = useState(() => {
    try {
      const saved = localStorage.getItem('campushub_registrations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const showToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const loadHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthStatus({ ok: Boolean(data?.ok), checking: false });
    } catch {
      setHealthStatus({ ok: false, checking: false });
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Error Loading Events', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const cat = getEventCategory(ev.title).name;
      const matchesCategory = selectedCategory === 'All' || cat === selectedCategory;
      const matchesSearch =
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.venue && ev.venue.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [events, selectedCategory, searchQuery]);

  // Statistics calculation
  const totalRegistrations = useMemo(() => {
    return events.reduce((sum, ev) => sum + (Number(ev.registrations) || 0), 0);
  }, [events]);

  const uniqueVenuesCount = useMemo(() => {
    const venues = new Set(events.map((e) => e.venue).filter(Boolean));
    return venues.size;
  }, [events]);

  // Handle Event Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.email.trim()) {
      showToast('Validation Error', 'Please provide both your name and email.', 'error');
      return;
    }

    try {
      setRegSubmitting(true);
      const res = await fetch(`/api/events/${registerEvent.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });

      if (res.status === 202 || res.ok) {
        showToast('Registration Accepted!', `Confirmation email sent to ${regForm.email}`, 'success');

        // Persist to local "My Registrations" list
        const record = {
          eventId: registerEvent.id,
          title: registerEvent.title,
          venue: registerEvent.venue,
          date: registerEvent.starts_at,
          registeredAt: new Date().toISOString(),
          studentName: regForm.name,
          studentEmail: regForm.email,
        };

        const updated = [record, ...myRegistrations];
        setMyRegistrations(updated);
        try {
          localStorage.setItem('campushub_registrations', JSON.stringify(updated));
        } catch {}

        setRegForm({ name: '', email: '' });
        setRegisterEvent(null);
        loadEvents();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast('Registration Failed', errData.error || 'Server error', 'error');
      }
    } catch (err) {
      showToast('Network Error', err.message, 'error');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Handle Image Upload
  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Only image files (PNG, JPG, WebP) are allowed.', 'error');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum image size allowed is 4 MB.', 'error');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('No File Selected', 'Please select an image to upload.', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', selectedFile);

      const res = await fetch(`/api/events/${uploadEvent.id}/image`, {
        method: 'POST',
        body: formData,
      });

      if (res.status === 201 || res.ok) {
        showToast('Banner Uploaded!', 'Event banner saved to MinIO storage.', 'success');
        setSelectedFile(null);
        setPreviewUrl('');
        setUploadEvent(null);
        loadEvents();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Upload Failed', err.error || 'Could not upload banner image.', 'error');
      }
    } catch (err) {
      showToast('Upload Error', err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-wrapper">
      {/* Toast Notification Container */}
      <div className="toast-container" role="region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-content">
              <h5>{t.title}</h5>
              <p>{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Header & Navigation */}
      <header className="header-glass">
        <div className="header-container">
          <div className="brand-section">
            <div className="brand-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                <path d="M6 6h10"></path>
                <path d="M6 10h10"></path>
              </svg>
            </div>
            <div className="brand-title-group">
              <h1>
                CampusHub <span className="accent-tag">PRO</span>
              </h1>
              <p className="brand-subtitle">University Event Management & Registration</p>
            </div>
          </div>

          <nav className="nav-center">
            <button
              className={`nav-tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
              onClick={() => setActiveTab('explore')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Explore Events
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'my-registrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-registrations')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              My Registrations ({myRegistrations.length})
            </button>
          </nav>

          <div className="header-right">
            <div className="status-pill" title="Live status from /api/health">
              <span className={`status-dot ${healthStatus.ok ? 'healthy' : 'unhealthy'}`}></span>
              <span>{healthStatus.ok ? 'Cluster Healthy' : 'Degraded Service'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-wrapper">
        <div className="hero-container">
          <div className="hero-badge-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Official University Hub
          </div>
          <h2 className="hero-title">
            Discover What's Happening <br />
            <span className="gradient-text">on Campus Every Week.</span>
          </h2>
          <p className="hero-desc">
            Explore student hackathons, career networking events, and robotics showcases.
            Register instantly and receive your confirmed ticket via automated campus messaging.
          </p>

          {/* Quick Metrics */}
          <div className="hero-stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">{events.length}</div>
                <div className="stat-label">Active Events</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">{totalRegistrations}</div>
                <div className="stat-label">Registrations</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon cyan">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">{uniqueVenuesCount}</div>
                <div className="stat-label">Campus Venues</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon emerald">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">Redis / MQ</div>
                <div className="stat-label">Fast Caching & Queues</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'explore' ? (
          <>
            {/* Search and Category Filter Bar */}
            <div className="control-bar">
              <div className="search-box-wrapper">
                <div className="search-icon-pos">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search events by title or campus venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="category-chips">
                {['All', 'Tech & Hackathon', 'Career & Networking', 'Robotics & STEM'].map((cat) => (
                  <button
                    key={cat}
                    className={`chip-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Cards Grid */}
            {loading ? (
              <div className="events-grid">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton-card">
                    <div className="skeleton-box" style={{ height: '180px' }}></div>
                    <div className="skeleton-box" style={{ height: '24px', width: '70%' }}></div>
                    <div className="skeleton-box" style={{ height: '16px', width: '50%' }}></div>
                    <div className="skeleton-box" style={{ height: '36px', marginTop: 'auto' }}></div>
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: '16px', border: '1px solid var(--slate-200)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--slate-800)', marginBottom: '0.4rem' }}>No events found</h3>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>Try clearing your search query or choosing another category.</p>
              </div>
            ) : (
              <div className="events-grid">
                {filteredEvents.map((ev) => {
                  const category = getEventCategory(ev.title);
                  const desc = getEventDescription(ev.title);
                  const formattedDate = ev.starts_at
                    ? new Date(ev.starts_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Upcoming Soon';

                  return (
                    <article key={ev.id} className="event-card">
                      <div className="event-card-media">
                        <span className={`card-category-tag ${category.tagClass}`}>
                          {category.name}
                        </span>

                        <span className="card-registrations-badge">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                          </svg>
                          {ev.registrations} registered
                        </span>

                        {ev.image_url ? (
                          <img src={ev.image_url} alt={ev.title} loading="lazy" />
                        ) : (
                          <div className="media-fallback-banner">
                            <div className="media-fallback-pattern"></div>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem', zIndex: 1 }}>
                              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                              <polyline points="2 17 12 22 22 17"></polyline>
                              <polyline points="2 12 12 17 22 12"></polyline>
                            </svg>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', zIndex: 1 }}>
                              Campus Event Banner
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="card-body">
                        <h3 className="card-title">{ev.title}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '1.2rem', lineHeight: '1.5' }}>
                          {desc}
                        </p>

                        <div className="card-meta-list">
                          <div className="card-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>{formattedDate}</span>
                          </div>

                          <div className="card-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>{ev.venue || 'Campus Auditorium'}</span>
                          </div>
                        </div>

                        <div className="card-actions-row">
                          <button
                            className="btn-primary-action"
                            onClick={() => {
                              setRegisterEvent(ev);
                              setRegForm({ name: '', email: '' });
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <line x1="19" y1="8" x2="19" y2="14"></line>
                              <line x1="22" y1="11" x2="16" y2="11"></line>
                            </svg>
                            Register Now
                          </button>

                          <button
                            className="btn-secondary-action"
                            title="Upload or change event banner"
                            onClick={() => {
                              setUploadEvent(ev);
                              setSelectedFile(null);
                              setPreviewUrl('');
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Banner
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* My Registrations Tab View */
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--slate-900)' }}>
                  My Confirmed Registrations
                </h3>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>
                  Events registered through this browser session.
                </p>
              </div>
              <button
                className="chip-btn"
                onClick={() => {
                  setMyRegistrations([]);
                  localStorage.removeItem('campushub_registrations');
                  showToast('History Cleared', 'Local registrations list has been reset.', 'info');
                }}
              >
                Clear History
              </button>
            </div>

            {myRegistrations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'white', borderRadius: '16px', border: '1px solid var(--slate-200)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <h4 style={{ fontSize: '1.15rem', color: 'var(--slate-800)', marginBottom: '0.35rem' }}>No registrations yet</h4>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                  Browse upcoming campus events and reserve your student ticket.
                </p>
                <button className="btn-primary-action" style={{ display: 'inline-flex', width: 'auto' }} onClick={() => setActiveTab('explore')}>
                  Explore Events
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myRegistrations.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'white',
                      border: '1px solid var(--slate-200)',
                      borderRadius: '12px',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-700)', background: 'var(--success-50)', padding: '0.2rem 0.6rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        CONFIRMED TICKET
                      </span>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)', marginTop: '0.4rem' }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginTop: '0.2rem' }}>
                        Venue: <strong>{item.venue}</strong> · Student: <strong>{item.studentName}</strong> ({item.studentEmail})
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>
                        Registered: {new Date(item.registeredAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Registration Modal Dialog */}
      {registerEvent && (
        <div className="modal-overlay" onClick={() => !regSubmitting && setRegisterEvent(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Event Registration</h3>
                <p>Reserve your verified student spot</p>
              </div>
              <button className="modal-close-btn" disabled={regSubmitting} onClick={() => setRegisterEvent(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleRegister} className="modal-body">
              <div className="event-preview-card">
                <h4>{registerEvent.title}</h4>
                <p>
                  📍 {registerEvent.venue} · 📅{' '}
                  {registerEvent.starts_at ? new Date(registerEvent.starts_at).toLocaleDateString() : 'Upcoming'}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student-name">
                  Student Full Name <span style={{ color: 'var(--danger-500)' }}>*</span>
                </label>
                <input
                  id="student-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex Morgan"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student-email">
                  University Email Address <span style={{ color: 'var(--danger-500)' }}>*</span>
                </label>
                <input
                  id="student-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. alex.morgan@campus.edu"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary-action" style={{ width: '100%', padding: '0.85rem' }} disabled={regSubmitting}>
                {regSubmitting ? 'Processing Registration...' : 'Complete Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Upload Modal Dialog */}
      {uploadEvent && (
        <div className="modal-overlay" onClick={() => !uploading && setUploadEvent(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Upload Event Banner</h3>
                <p>Attach a high-resolution banner image (Max 4 MB)</p>
              </div>
              <button className="modal-close-btn" disabled={uploading} onClick={() => setUploadEvent(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="modal-body">
              <div className="event-preview-card">
                <h4>{uploadEvent.title}</h4>
                <p>📍 {uploadEvent.venue}</p>
              </div>

              <div
                className={`dropzone ${isDragging ? 'active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
                }}
                onClick={() => document.getElementById('event-banner-input').click()}
              >
                <input
                  id="event-banner-input"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(e.target.files[0])}
                />
                <div className="dropzone-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <div className="dropzone-text-primary">
                  {selectedFile ? selectedFile.name : 'Click to upload or drag & drop banner'}
                </div>
                <div className="dropzone-text-secondary">
                  PNG, JPG, or WebP up to 4 MB
                </div>
              </div>

              {previewUrl && (
                <div className="image-preview-box">
                  <img src={previewUrl} alt="Preview" />
                </div>
              )}

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary-action"
                  style={{ flex: 1 }}
                  disabled={uploading}
                  onClick={() => setUploadEvent(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  style={{ flex: 2 }}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading to MinIO...' : 'Upload Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="brand-section">
                <div className="brand-icon-box" style={{ width: '36px', height: '36px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                    <path d="M6 6h10"></path>
                    <path d="M6 10h10"></path>
                  </svg>
                </div>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--slate-900)' }}>
                  CampusHub
                </h4>
              </div>
              <p>
                Enterprise-grade university event management platform powered by high-performance microservices.
              </p>
            </div>

            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                Underlying Stack
              </div>
              <div className="tech-badges-grid">
                <span className="tech-badge">PostgreSQL 16</span>
                <span className="tech-badge">Redis 7 In-Memory</span>
                <span className="tech-badge">RabbitMQ 3.13</span>
                <span className="tech-badge">MinIO Object Store</span>
                <span className="tech-badge">MailHog SMTP</span>
                <span className="tech-badge">Nginx Gateway</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} CampusHub Platform. All campus rights reserved.</span>
            <span>Production Containerized Microservices</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
