import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

interface ContactPageProps {
  onBack: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ContactPage: React.FC<ContactPageProps> = ({ onBack, showToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Contact from Swim Lab');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

   const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!message.trim()) {
      showToast('Please enter a message before sending.', 'error');
      return;
    }

    if (!email.trim()) {
      showToast('Please provide your email address so we can reply.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Anonymous',
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
        throw new Error(error.error || 'Failed to send message');
      }

      showToast('Message sent successfully!', 'success');
      setName('');
      setEmail('');
      setSubject('Contact from Swim Lab');
      setMessage('');
    } catch (error) {
      showToast(`Error sending message: ${(error as Error).message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contact-page card">
      <div className="section-header">
        <button className="btn-ghost section-toggle" onClick={onBack} title="Back to home">
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h2>Contact Swim Lab</h2>
      </div>
      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
        Have a question or feedback? Fill out the form below and we'll get back to you as soon as possible.
      </p>
      <form className="contact-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name (optional)"
            disabled={submitting}
          />
        </label>
        <label>
          Email <span style={{ color: 'var(--danger)' }}>*</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            disabled={submitting}
          />
        </label>
        <label>
          Subject
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={submitting}
          />
        </label>
        <label>
          Message <span style={{ color: 'var(--danger)' }}>*</span>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={7}
            placeholder="Write your message here..."
            required
            disabled={submitting}
          />
        </label>
        <button type="submit" className="btn" style={{ marginTop: '1rem' }} disabled={submitting}>
          <FontAwesomeIcon icon={faPaperPlane} /> {submitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </section>
  );
};

export default ContactPage;
