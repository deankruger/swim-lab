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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!message.trim()) {
      showToast('Please enter a message before sending.', 'error');
      return;
    }

    const bodyLines = [
      name.trim() ? `Name: ${name.trim()}` : null,
      email.trim() ? `Email: ${email.trim()}` : null,
      '',
      message.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    const mailto = `mailto:swim.lab.info@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines)}`;
    window.location.href = mailto;
    showToast('Opening your email client to send the message.', 'success');
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
        Fill out the form below and your default email client will open so you can send the message to swim-lab@gmail.com.
      </p>
      <form className="contact-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email address"
          />
        </label>
        <label>
          Subject
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </label>
        <label>
          Message
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={7}
            placeholder="Write your message here..."
            required
          />
        </label>
        <button type="submit" className="btn" style={{ marginTop: '1rem' }}>
          <FontAwesomeIcon icon={faPaperPlane} /> Send Email
        </button>
      </form>
    </section>
  );
};

export default ContactPage;
