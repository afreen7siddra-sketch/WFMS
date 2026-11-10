import { useEffect, useState, type FormEvent } from 'react';
import './App.css';
import { supabase } from './supabase';

type Page =
  | 'home'
  | 'about'
  | 'finance'
  | 'marketing'
  | 'trade'
  | 'economics'
  | 'governance'
  | 'research'
  | 'contact'
  | 'account'
  | 'ceo'
  | 'executive'
  | 'editorial'
  | 'editProfile'
  | 'members'
  | 'researchSubmit';

type Section =
  | 'ongoing'
  | 'completed'
  | 'publications'
  | 'events'
  | 'discussion';

type Division = {
  name: string;
  shortName: string;
  page: Page;
  number: string;
  description: string;
  focus: string;
};

type ResearchSubmission = {
  id: string;
  title: string;
  division: string;
  abstract: string;
  file_path: string | null;
  status: string;
  editor_feedback: string | null;
  submitted_at: string;
};

type DiscussionRoom = {
  id: string;
  name: string;
  description: string | null;
  division: string;
  created_by: string;
  is_public: boolean;
  created_at: string;
};

type DiscussionMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  attachment_path: string | null;
  created_at: string;
};

const divisions: Division[] = [
  {
    name: 'Finance Research Club',
    shortName: 'Finance',
    page: 'finance',
    number: '01',
    description: 'Exploring financial systems, markets and global investment.',
    focus:
      'Financial markets, banking, investment and global financial developments.',
  },
  {
    name: 'Marketing Research Club',
    shortName: 'Marketing',
    page: 'marketing',
    number: '02',
    description: 'Understanding markets, consumers and business strategy.',
    focus:
      'Consumer behaviour, branding, advertising and global marketing strategy.',
  },
  {
    name: 'Trade Research Club',
    shortName: 'Trade',
    page: 'trade',
    number: '03',
    description: 'Researching international trade and global commerce.',
    focus:
      'International trade, global commerce, trade policies and supply chains.',
  },
  {
    name: 'Economic Research Club',
    shortName: 'Economics',
    page: 'economics',
    number: '04',
    description: 'Examining economic policies, development and global trends.',
    focus:
      'Economic policy, development, inflation, employment and global economic trends.',
  },
];

const sections: {
  id: Section;
  number: string;
  title: string;
  description: string;
}[] = [
  {
    id: 'ongoing',
    number: '01',
    title: 'Ongoing Research Projects',
    description: 'Current research and collaborative initiatives.',
  },
  {
    id: 'completed',
    number: '02',
    title: 'Completed Research',
    description: 'Completed studies, findings and contributions.',
  },
  {
    id: 'publications',
    number: '03',
    title: 'Research Publications',
    description: 'Published research papers and academic contributions.',
  },
  {
    id: 'events',
    number: '04',
    title: 'Events & Activities',
    description: 'Meetings, seminars, competitions and activities.',
  },
  {
    id: 'discussion',
    number: '05',
    title: 'Member Discussion Room',
    description: 'Exchange ideas and collaborate with fellow researchers.',
  },
];

const roleNames: Record<string, string> = {
  ceo: 'Founder & Chief Executive Officer',
  founder: 'Founder & Chief Executive Officer',
  executive_director: 'Executive Director',
  division_director: 'Division Director',
  editorial_board: 'Editorial Board Member',
  member: 'General Member',
};

const statusLabels: Record<string, string> = {
  under_review: 'Under Review',
  revision_requested: 'Revision Requested',
  approved: 'Approved',
  published: 'Published',
  rejected: 'Rejected',
};

function App() {
  const [page, setPage] = useState<Page>('home');
  const [section, setSection] = useState<Section | ''>('');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All');

  const [submissions, setSubmissions] = useState<ResearchSubmission[]>([]);
  const [publishedResearch, setPublishedResearch] = useState<
    ResearchSubmission[]
  >([]);

  const [rooms, setRooms] = useState<DiscussionRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<DiscussionRoom | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [roomMembers, setRoomMembers] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomDivision, setRoomDivision] = useState('general');
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const role = String(user?.app_metadata?.role || 'member').toLowerCase();

  const isCEO = ['ceo', 'founder'].includes(role);

  const isExecutive = ['ceo', 'founder', 'executive_director'].includes(role);

  const isEditorial = [
    'ceo',
    'founder',
    'executive_director',
    'editorial_board',
  ].includes(role);

  const currentDivision = divisions.find((item) => item.page === page);
  const currentRole = roleNames[role] || 'General Member';

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) console.error(error);

      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSubmissions([]);
      setRooms([]);
      setActiveRoom(null);
      return;
    }

    loadMySubmissions();
    loadRooms();
  }, [user?.id]);

  useEffect(() => {
    loadPublishedResearch();
  }, []);

  useEffect(() => {
    if (!activeRoom || !user) {
      setMessages([]);
      setRoomMembers([]);
      return;
    }

    loadMessages(activeRoom.id);
    loadRoomMembers(activeRoom.id);

    const channel = supabase
      .channel(`discussion-room-${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discussion_messages',
          filter: `room_id=eq.${activeRoom.id}`,
        },
        (payload) => {
          const newMessage = payload.new as DiscussionMessage;

          setMessages((previous) => {
            if (previous.some((item) => item.id === newMessage.id)) {
              return previous;
            }

            return [...previous, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom?.id, user?.id]);

  async function loadMySubmissions() {
    if (!user) return;

    const { data, error } = await supabase
      .from('research_submissions')
      .select('*')
      .eq('author_id', user.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Research submissions:', error.message);
      return;
    }

    setSubmissions((data || []) as ResearchSubmission[]);
  }

  async function loadPublishedResearch() {
    const { data, error } = await supabase
      .from('research_submissions')
      .select('*')
      .eq('status', 'published')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Published research:', error.message);
      return;
    }

    setPublishedResearch((data || []) as ResearchSubmission[]);
  }

  async function loadRooms() {
    const { data, error } = await supabase
      .from('discussion_rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Discussion rooms:', error.message);
      setNotice(`Unable to load discussion rooms: ${error.message}`);
      return;
    }

    setRooms((data || []) as DiscussionRoom[]);
  }

  async function loadMessages(roomId: string) {
    const { data, error } = await supabase
      .from('discussion_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      setNotice(`Unable to load messages: ${error.message}`);
      return;
    }

    setMessages((data || []) as DiscussionMessage[]);
  }

  async function loadRoomMembers(roomId: string) {
    const { data, error } = await supabase
      .from('discussion_room_members')
      .select('user_id')
      .eq('room_id', roomId);

    if (error) {
      console.error('Room members:', error.message);
      return;
    }

    setRoomMembers((data || []).map((item: any) => item.user_id));
  }

  function navigate(nextPage: Page) {
    const protectedPages: Page[] = [
      'ceo',
      'executive',
      'editorial',
      'members',
      'researchSubmit',
    ];

    if (protectedPages.includes(nextPage) && !user) {
      setNotice('Please sign in to access this area.');
      setPage('account');
      return;
    }

    setPage(nextPage);
    setSection('');
    setMobileMenu(false);
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openSection(nextSection: Section) {
    setSection(nextSection);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setSection('');
    setActiveRoom(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function signIn(email: string, password: string) {
    setBusy(true);
    setNotice('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setNotice('Welcome back! You are signed in.');
      setPage('account');
    } catch (error: any) {
      setNotice(error.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    country: string,
    division: string
  ) {
    setBusy(true);
    setNotice('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            country,
            division,
          },
        },
      });

      if (error) throw error;

      setNotice(
        'Registration submitted! Check your email for confirmation. Membership may require approval.'
      );
      setAuthMode('login');
    } catch (error: any) {
      setNotice(error.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!loginEmail) {
      setNotice('Enter your email address first.');
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;

      setNotice('Password reset instructions have been sent to your email.');
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice(error.message);
      return;
    }

    setPage('home');
    setSection('');
    setActiveRoom(null);
    setNotice('You have signed out.');
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setNotice('Please sign in first.');
      return;
    }

    const form = new FormData(event.currentTarget);

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: String(form.get('fullName')),
          country: String(form.get('country')),
          division: String(form.get('division')),
        },
      });

      if (error) throw error;

      setNotice('Your profile has been updated.');
      setPage('account');
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setNotice('Please sign in first.');
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const division = String(form.get('division') || '');
    const abstract = String(form.get('abstract') || '').trim();
    const file = form.get('researchFile') as File | null;

    if (!title || !division || !abstract) {
      setNotice('Please complete all required research details.');
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      setNotice('Your research file must be 10 MB or smaller.');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      let filePath: string | null = null;

      if (file && file.size > 0) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        filePath = `${user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('wfms-research')
          .upload(filePath, file, {
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          });

        if (uploadError) throw uploadError;
      }

      const { error: insertError } = await supabase
        .from('research_submissions')
        .insert({
          author_id: user.id,
          title,
          division: division.toLowerCase(),
          abstract,
          file_path: filePath,
          status: 'under_review',
        });

      if (insertError) throw insertError;

      await loadMySubmissions();

      setNotice('Your research submission has been received successfully.');
      setPage('account');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setNotice(`Submission failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setNotice('Please sign in to create a discussion room.');
      return;
    }

    const name = roomName.trim();

    if (!name) {
      setNotice('Please enter a room name.');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      const { data: room, error: roomError } = await supabase
        .from('discussion_rooms')
        .insert({
          name,
          description: roomDescription.trim(),
          division: roomDivision,
          created_by: user.id,
          is_public: true,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: memberError } = await supabase
        .from('discussion_room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      setRoomName('');
      setRoomDescription('');
      setRoomDivision('general');
      setShowCreateRoom(false);

      await loadRooms();
      setActiveRoom(room as DiscussionRoom);
      setNotice('Your discussion room has been created.');
    } catch (error: any) {
      setNotice(`Could not create room: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom(room: DiscussionRoom) {
    if (!user) {
      setNotice('Please sign in to join a discussion room.');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      const { error } = await supabase.from('discussion_room_members').insert({
        room_id: room.id,
        user_id: user.id,
      });

      if (error && !error.message.toLowerCase().includes('duplicate')) {
        throw error;
      }

      setActiveRoom(room);
      await loadRoomMembers(room.id);
    } catch (error: any) {
      setNotice(`Unable to join room: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !activeRoom) return;

    const message = messageText.trim();

    if (!message && !messageFile) {
      setNotice('Write a message or attach a file first.');
      return;
    }

    if (messageFile && messageFile.size > 10 * 1024 * 1024) {
      setNotice('Attachments must be 10 MB or smaller.');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      let attachmentPath: string | null = null;

      if (messageFile) {
        const safeName = messageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        attachmentPath = `${activeRoom.id}/${
          user.id
        }/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('wfms-discussion-files')
          .upload(attachmentPath, messageFile, {
            upsert: false,
            contentType: messageFile.type || 'application/octet-stream',
          });

        if (uploadError) throw uploadError;
      }

      const { error } = await supabase.from('discussion_messages').insert({
        room_id: activeRoom.id,
        sender_id: user.id,
        message,
        attachment_path: attachmentPath,
      });

      if (error) throw error;

      setMessageText('');
      setMessageFile(null);

      const fileInput = document.getElementById(
        'discussion-attachment'
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = '';

      await loadMessages(activeRoom.id);
    } catch (error: any) {
      setNotice(`Message could not be sent: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function openAttachment(path: string, bucket: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 5);

    if (error) {
      setNotice(`Unable to open attachment: ${error.message}`);
      return;
    }

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  }

  function heading(eyebrow: string, title: string, description?: string) {
    return (
      <>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </>
    );
  }

  function emptyState(title: string, description: string) {
    return (
      <div className="content-block">
        <h2>{title}</h2>
        <p>{description}</p>
        <p>
          <small>
            Content will appear here when it is added to the WFMS database.
          </small>
        </p>
      </div>
    );
  }

  function divisionCards() {
    return (
      <div className="division-grid">
        {divisions.map((division) => (
          <button
            className="division-card"
            key={division.number}
            onClick={() => navigate(division.page)}
          >
            <span>{division.number}</span>
            <h3>{division.name}</h3>
            <p>{division.description}</p>
            <strong>Explore Division →</strong>
          </button>
        ))}
      </div>
    );
  }

  function portalCards() {
    const cards = [
      {
        title: 'My Profile',
        description: 'Manage your personal information.',
        action: () => navigate('editProfile'),
      },
      {
        title: 'My Division',
        description: 'Explore your research division.',
        action: () => {
          const division = divisions.find(
            (item) =>
              item.shortName.toLowerCase() ===
              String(user?.user_metadata?.division || '').toLowerCase()
          );
          navigate(division?.page || 'research');
        },
      },
      {
        title: 'Submit Research',
        description: 'Send your research to the WFMS review process.',
        action: () => navigate('researchSubmit'),
      },
      {
        title: 'My Research Projects',
        description: 'View your research submissions and their status.',
        action: () => navigate('researchSubmit'),
      },
      {
        title: 'Research Library',
        description: 'Explore WFMS research publications.',
        action: () => navigate('research'),
      },
      {
        title: 'Meetings & Events',
        description: 'Explore meetings and upcoming activities.',
        action: () => {
          setNotice(
            'Open a research division to explore its Events & Activities section.'
          );
        },
      },
      {
        title: 'Community & Discussions',
        description: 'Connect with fellow researchers.',
        action: () => {
          navigate('research');
          setSection('discussion');
        },
      },
    ];

    return (
      <div className="profile-grid">
        {cards.map((card) => (
          <button
            className="content-block clickable-card"
            key={card.title}
            onClick={card.action}
          >
            <h2>{card.title} →</h2>
            <p>{card.description}</p>
          </button>
        ))}
      </div>
    );
  }

  function renderResearchSubmissions() {
    return (
      <div className="content-block">
        <h2>My Research Submissions</h2>

        {submissions.length === 0 ? (
          <p>You have not submitted any research papers yet.</p>
        ) : (
          submissions.map((item) => (
            <div className="content-block" key={item.id}>
              <span className="eyebrow">
                {item.division.toUpperCase()} DIVISION
              </span>
              <h3>{item.title}</h3>
              <p>
                <strong>Status:</strong>{' '}
                {statusLabels[item.status] || item.status}
              </p>
              <p>
                <strong>Submitted:</strong>{' '}
                {new Date(item.submitted_at).toLocaleDateString()}
              </p>
              {item.editor_feedback && (
                <p>
                  <strong>Editorial feedback:</strong> {item.editor_feedback}
                </p>
              )}
              {item.file_path && (
                <button
                  className="outline-button"
                  onClick={() =>
                    openAttachment(item.file_path!, 'wfms-research')
                  }
                >
                  Open My File
                </button>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  function renderDiscussionRoom() {
    if (!user) {
      return emptyState(
        'Member Sign In Required',
        'Sign in to join discussions and collaborate with other WFMS members.'
      );
    }

    if (activeRoom) {
      return (
        <div className="content-block">
          <button
            className="outline-button"
            onClick={() => setActiveRoom(null)}
          >
            ← All Discussion Rooms
          </button>

          <h2>{activeRoom.name}</h2>
          <p>{activeRoom.description || 'WFMS member discussion room.'}</p>
          <p>
            <small>
              Division: {activeRoom.division} · {roomMembers.length} members
            </small>
          </p>

          <div className="content-block">
            <h3>Conversation</h3>

            {messages.length === 0 ? (
              <p>No messages yet. Start the conversation!</p>
            ) : (
              messages.map((item) => (
                <div className="content-block" key={item.id}>
                  <p>
                    <strong>
                      {item.sender_id === user.id
                        ? 'You'
                        : `Member ${item.sender_id.slice(0, 8)}`}
                    </strong>
                  </p>
                  {item.message && <p>{item.message}</p>}
                  {item.attachment_path && (
                    <button
                      className="outline-button"
                      onClick={() =>
                        openAttachment(
                          item.attachment_path!,
                          'wfms-discussion-files'
                        )
                      }
                    >
                      Open Attachment
                    </button>
                  )}
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                </div>
              ))
            )}
          </div>

          <form className="content-block" onSubmit={sendMessage}>
            <label>Write a message</label>
            <textarea
              rows={3}
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Share an idea with your fellow members..."
            />

            <label>Attach a file (optional, maximum 10 MB)</label>
            <input
              id="discussion-attachment"
              type="file"
              onChange={(event) =>
                setMessageFile(event.target.files?.[0] || null)
              }
            />

            <button className="gold-button" type="submit" disabled={busy}>
              {busy ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="content-block">
        <h2>WFMS Member Discussion Rooms</h2>
        <p>
          Join a room to exchange ideas, discuss research and collaborate with
          fellow members.
        </p>

        <button
          className="gold-button"
          onClick={() => setShowCreateRoom((value) => !value)}
        >
          {showCreateRoom ? 'Cancel' : 'Create Discussion Room'}
        </button>

        {showCreateRoom && (
          <form className="content-block" onSubmit={createRoom}>
            <h3>Create a New Room</h3>

            <label>Room Name</label>
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="e.g. Global Markets Discussion"
              required
            />

            <label>Description</label>
            <textarea
              rows={3}
              value={roomDescription}
              onChange={(event) => setRoomDescription(event.target.value)}
              placeholder="What will members discuss in this room?"
            />

            <label>Division</label>
            <select
              value={roomDivision}
              onChange={(event) => setRoomDivision(event.target.value)}
            >
              <option value="general">General</option>
              <option value="finance">Finance</option>
              <option value="marketing">Marketing</option>
              <option value="trade">Trade</option>
              <option value="economics">Economics</option>
            </select>

            <button className="gold-button" type="submit" disabled={busy}>
              {busy ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        )}

        <h3>Available Rooms</h3>

        {rooms.length === 0 ? (
          <p>No discussion rooms have been created yet.</p>
        ) : (
          rooms.map((room) => {
            const isMember = roomMembers.includes(user.id);

            return (
              <div className="content-block" key={room.id}>
                <span className="eyebrow">{room.division.toUpperCase()}</span>
                <h3>{room.name}</h3>
                <p>{room.description || 'WFMS member discussion room.'}</p>
                <button
                  className="outline-button"
                  onClick={() => joinRoom(room)}
                  disabled={busy}
                >
                  {isMember ? 'Open Room →' : 'Join Room →'}
                </button>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="website">
      {/* HEADER */}

      <header className="header">
        <button className="brand" onClick={() => navigate('home')}>
          <span className="brand-symbol">W</span>
          <span>
            <strong>WFMS</strong>
            <small>WORLD FINANCE AND MARKETING SOCIETY</small>
          </span>
        </button>

        <nav className={`navigation ${mobileMenu ? 'mobile-open' : ''}`}>
          <button onClick={() => navigate('home')}>Home</button>
          <button onClick={() => navigate('about')}>About</button>
          <button onClick={() => navigate('research')}>Research</button>
          <button onClick={() => navigate('governance')}>Governance</button>
          <button onClick={() => navigate('contact')}>Contact</button>
        </nav>

        <button
          className="profile-button"
          onClick={() => navigate('account')}
          aria-label="My account"
          title="My account"
        >
          ♙
        </button>

         
      </header>

      {notice && (
        <div className="content-block" role="status">
          <p>{notice}</p>
          <button onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}

      {/* HOMEPAGE */}

      {page === 'home' && (
        <main>
          <section className="hero">
            <div className="hero-content">
              <span className="eyebrow">
                INDEPENDENT RESEARCH • GLOBAL PERSPECTIVES
              </span>

              <h1>
                Advancing Knowledge.
                <br />
                Building a Global Future.
              </h1>

              <p>
                A society dedicated to exploring finance, marketing,
                international trade and economics through research,
                collaboration and intellectual development.
              </p>

              <button className="gold-button" onClick={() => navigate('about')}>
                Discover WFMS →
              </button>

              <button
                className="outline-button"
                onClick={() => navigate('account')}
              >
                Join WFMS →
              </button>
            </div>
          </section>

          <section className="section agenda">
            <span className="eyebrow">OUR PURPOSE</span>
            <h2>Why WFMS Exists</h2>
            <p>
              WFMS brings together curious minds to study the forces shaping the
              global financial and economic landscape. Through independent
              research, meaningful collaboration and accessible publications, we
              aim to create knowledge that matters.
            </p>
          </section>

          <section className="section divisions-section">
            <span className="eyebrow">OUR RESEARCH NETWORK</span>
            <h2>Four Divisions. One Vision.</h2>
            {divisionCards()}
          </section>

          <section className="section governance-preview">
            <span className="eyebrow">LEADERSHIP & INTEGRITY</span>
            <h2>Our Governance</h2>
            <p>
              Discover the leadership, executive structure and editorial
              governance behind WFMS.
            </p>
            <button
              className="outline-button"
              onClick={() => navigate('governance')}
            >
              Explore Governance →
            </button>
          </section>

          <section className="section research-preview">
            <span className="eyebrow">KNOWLEDGE FOR EVERYONE</span>
            <h2>Research & Publications</h2>
            <p>
              Explore research papers and completed projects from our four
              divisions, freely accessible to the public.
            </p>
            <button
              className="gold-button"
              onClick={() => navigate('research')}
            >
              Explore Publications →
            </button>
          </section>

          <section className="section partnership">
            <h2>Collaborate With WFMS</h2>
            <p>
              We welcome meaningful academic collaborations and institutional
              partnerships.
            </p>
            <button
              className="outline-button"
              onClick={() => navigate('contact')}
            >
              Get in Touch →
            </button>
          </section>
        </main>
      )}

      {/* ABOUT */}

      {page === 'about' && (
        <main className="inner-page">
          {heading(
            'GET TO KNOW US',
            'About WFMS',
            'The World Finance and Marketing Society.'
          )}

          <h2>Our Founding Story</h2>
          <p>
            The World Finance and Marketing Society was established to encourage
            independent research and intellectual collaboration across finance,
            marketing, trade and economics.
          </p>

          <h2>Our Mission</h2>
          <p>
            To promote research, analytical thinking and accessible knowledge
            through global collaboration.
          </p>

          <h2>Our Vision</h2>
          <p>
            To build an internationally connected research community that
            contributes meaningful ideas to the world.
          </p>

          <h2>Our Objectives</h2>
          <ul>
            <li>Encourage independent academic research.</li>
            <li>Publish original research and analysis.</li>
            <li>Develop international research collaborations.</li>
            <li>Create opportunities for young researchers.</li>
            <li>Promote accessible and responsible knowledge.</li>
          </ul>
        </main>
      )}

      {/* DIVISION PAGES */}

      {currentDivision && (
        <main className="division-page">
          {!section ? (
            <>
              <section className="division-hero">
                <span className="eyebrow">WFMS RESEARCH NETWORK</span>
                <h1>{currentDivision.name}</h1>
                <p>{currentDivision.description}</p>
                <p>{currentDivision.focus}</p>
              </section>

              <section className="division-content">
                <div className="division-intro">
                  <span className="eyebrow">EXPLORE OUR WORK</span>
                  <h2>Research. Discover. Contribute.</h2>
                  <p>
                    Explore research opportunities, current developments,
                    publications and collaborative activities within this
                    division.
                  </p>
                </div>

                <div className="division-grid">
                  {sections.map((item) => (
                    <button
                      className="division-card"
                      key={item.id}
                      onClick={() => openSection(item.id)}
                    >
                      <span>{item.number}</span>
                      <h3>{item.title} →</h3>
                      <p>{item.description}</p>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <main className="inner-page">
              <button className="outline-button" onClick={goBack}>
                ← Back to {currentDivision.shortName}
              </button>

              <span className="eyebrow">
                {currentDivision.shortName.toUpperCase()} DIVISION
              </span>

              <h1>{sections.find((item) => item.id === section)?.title}</h1>
              <p>{currentDivision.focus}</p>

              {section === 'ongoing' &&
                emptyState(
                  'Ongoing Research Projects',
                  'Approved and active research projects will appear here.'
                )}

              {section === 'completed' &&
                emptyState(
                  'Completed Research',
                  'Completed research and findings will appear here.'
                )}

              {section === 'publications' && (
                <>
                  {publishedResearch
                    .filter(
                      (item) =>
                        item.division.toLowerCase() ===
                        currentDivision.shortName.toLowerCase()
                    )
                    .map((item) => (
                      <div className="content-block" key={item.id}>
                        <h2>{item.title}</h2>
                        <p>{item.abstract}</p>
                        <small>
                          {currentDivision.shortName} · Published research
                        </small>
                        {item.file_path && (
                          <p>
                            <button
                              className="outline-button"
                              onClick={() =>
                                openAttachment(item.file_path!, 'wfms-research')
                              }
                            >
                              View Research File
                            </button>
                          </p>
                        )}
                      </div>
                    ))}
                  {publishedResearch.filter(
                    (item) =>
                      item.division.toLowerCase() ===
                      currentDivision.shortName.toLowerCase()
                  ).length === 0 &&
                    emptyState(
                      'Research Publications',
                      'Approved and published academic papers will appear here.'
                    )}
                </>
              )}

              {section === 'events' &&
                emptyState(
                  'Events & Activities',
                  'Upcoming division meetings, seminars and competitions will appear here.'
                )}

              {section === 'discussion' && renderDiscussionRoom()}
            </main>
          )}
        </main>
      )}

      {/* GOVERNANCE */}

      {page === 'governance' && (
        <main className="inner-page">
          {heading(
            'LEADERSHIP & ACCOUNTABILITY',
            'Governance',
            'The organisational and editorial governance of WFMS.'
          )}

          <div className="content-block">
            <h2>Founder & Chief Executive Officer</h2>
            <p>
              The Founder and CEO provides overall organisational leadership and
              strategic direction.
            </p>
          </div>

          <div className="content-block">
            <h2>Executive Directors</h2>
            <p>
              Executive Directors coordinate organisational operations,
              supervise research divisions, oversee membership and support
              institutional development.
            </p>
          </div>

          <div className="content-block">
            <h2>Division Directors</h2>
            <p>
              Division Directors coordinate research activities and member
              contributions within their respective divisions.
            </p>
          </div>

          <div className="content-block">
            <h2>Editorial Board</h2>
            <p>
              The Editorial Board is responsible for final publication
              evaluation, research quality and editorial integrity.
            </p>
          </div>

          <h2>Editorial Decision Structure</h2>
          <div className="content-block">
            <p>
              <strong>Leadership:</strong> Chief Executive Officer.
            </p>
            <p>
              <strong>Publication authority:</strong> Editorial Board.
            </p>
            <p>
              <strong>Review system:</strong> Shared responsibility between
              leadership and the Editorial Board.
            </p>
          </div>

          <h2>Research Publication Workflow</h2>
          <ol>
            <li>Member submits a research proposal.</li>
            <li>Division Director conducts initial review.</li>
            <li>Research is developed and completed.</li>
            <li>Editorial Board conducts final publication review.</li>
            <li>Approved research is published and archived.</li>
          </ol>
        </main>
      )}

      {/* RESEARCH LIBRARY */}

      {page === 'research' && (
        <main className="inner-page">
          {heading(
            'OPEN KNOWLEDGE',
            'Research & Publications',
            'A public research library across all four divisions.'
          )}

          <div className="content-block">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search research and publications..."
            />

            <select
              value={divisionFilter}
              onChange={(event) => setDivisionFilter(event.target.value)}
            >
              <option>All</option>
              {divisions.map((item) => (
                <option key={item.shortName}>{item.shortName}</option>
              ))}
            </select>
          </div>

          {divisions
            .filter(
              (item) =>
                divisionFilter === 'All' || divisionFilter === item.shortName
            )
            .filter(
              (item) =>
                !search ||
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.focus.toLowerCase().includes(search.toLowerCase())
            )
            .map((item) => (
              <div className="content-block" key={item.number}>
                <span className="eyebrow">{item.shortName.toUpperCase()}</span>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
                <button
                  className="outline-button"
                  onClick={() => navigate(item.page)}
                >
                  Explore Research →
                </button>
              </div>
            ))}

          <h2>Published Research</h2>

          {publishedResearch
            .filter(
              (item) =>
                divisionFilter === 'All' ||
                item.division.toLowerCase() === divisionFilter.toLowerCase()
            )
            .filter(
              (item) =>
                !search ||
                item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.abstract.toLowerCase().includes(search.toLowerCase())
            )
            .map((item) => (
              <div className="content-block" key={item.id}>
                <span className="eyebrow">{item.division.toUpperCase()}</span>
                <h2>{item.title}</h2>
                <p>{item.abstract}</p>
                {item.file_path && (
                  <button
                    className="outline-button"
                    onClick={() =>
                      openAttachment(item.file_path!, 'wfms-research')
                    }
                  >
                    View Research File
                  </button>
                )}
              </div>
            ))}

          {publishedResearch.length === 0 &&
            emptyState(
              'Public Research Library',
              'Published research papers and completed projects will be listed here when available.'
            )}
        </main>
      )}

      {/* RESEARCH SUBMISSION */}

      {page === 'researchSubmit' && (
        <main className="inner-page account-page">
          <button
            className="outline-button"
            onClick={() => navigate('account')}
          >
            ← Back to Dashboard
          </button>

          {heading(
            'WFMS RESEARCH PORTAL',
            'Submit Your Research',
            'Submit original work for consideration by the relevant WFMS division.'
          )}

          {!user ? (
            <p>Please sign in to submit research.</p>
          ) : (
            <>
              <form className="content-block" onSubmit={submitResearch}>
                <h2>Research Submission Form</h2>

                <label>Research Title</label>
                <input
                  name="title"
                  placeholder="Enter the title of your research"
                  required
                  maxLength={200}
                />

                <label>Research Division</label>
                <select name="division" required defaultValue="">
                  <option value="" disabled>
                    Select a division
                  </option>
                  {divisions.map((item) => (
                    <option
                      key={item.shortName}
                      value={item.shortName.toLowerCase()}
                    >
                      {item.shortName}
                    </option>
                  ))}
                </select>

                <label>Abstract</label>
                <textarea
                  name="abstract"
                  rows={8}
                  placeholder="Summarise your research question, approach, findings or intended contribution."
                  required
                />

                <label>Research File (PDF recommended, maximum 10 MB)</label>
                <input
                  name="researchFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                />

                <p>
                  Your submission will initially be marked as Under Review.
                  Submitting research does not guarantee publication.
                </p>

                <button className="gold-button" type="submit" disabled={busy}>
                  {busy ? 'Submitting...' : 'Submit Research'}
                </button>
              </form>

              {renderResearchSubmissions()}
            </>
          )}
        </main>
      )}

      {/* CONTACT */}

      {page === 'contact' && (
        <main className="inner-page">
          {heading(
            'CONNECT WITH US',
            'Contact & Partnerships',
            'For institutional partnerships, academic collaboration and general enquiries.'
          )}

          <form
            className="content-block"
            onSubmit={async (event) => {
              event.preventDefault();
              setNotice(
                'The contact form interface is ready. Connect a secure contact_messages database table to receive submissions.'
              );
            }}
          >
            <label>Your Name</label>
            <input name="name" required placeholder="Full name" />

            <label>Email Address</label>
            <input name="email" type="email" required placeholder="Email" />

            <label>Enquiry Type</label>
            <select name="type">
              <option>General Enquiry</option>
              <option>Academic Collaboration</option>
              <option>Institutional Partnership</option>
              <option>Research Enquiry</option>
              <option>Other</option>
            </select>

            <label>Message</label>
            <textarea name="message" required rows={5} />

            <button className="gold-button" type="submit">
              Submit Enquiry
            </button>
          </form>
        </main>
      )}

      {/* ACCOUNT */}

      {page === 'account' && (
        <main className="inner-page account-page">
          {authLoading ? (
            <h2>Loading your account...</h2>
          ) : !user ? (
            <>
              {heading(
                'YOUR WFMS MEMBERSHIP',
                'Welcome to WFMS',
                'Sign in or create an account to join our global research community.'
              )}

              <div className="content-block">
                <button
                  className={
                    authMode === 'login' ? 'gold-button' : 'outline-button'
                  }
                  onClick={() => setAuthMode('login')}
                >
                  Sign In
                </button>

                <button
                  className={
                    authMode === 'register' ? 'gold-button' : 'outline-button'
                  }
                  onClick={() => setAuthMode('register')}
                >
                  Create Account
                </button>
              </div>

              {authMode === 'login' ? (
                <form
                  className="content-block"
                  onSubmit={(event) => {
                    event.preventDefault();
                    signIn(loginEmail, loginPassword);
                  }}
                >
                  <h2>Member Sign In</h2>

                  <label>Email Address</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="Enter your email"
                    required
                  />

                  <label>Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                  />

                  <button type="button" onClick={resetPassword}>
                    Forgot Password?
                  </button>

                  <button className="gold-button" type="submit" disabled={busy}>
                    {busy ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form
                  className="content-block"
                  onSubmit={(event) => {
                    event.preventDefault();

                    const data = new FormData(event.currentTarget);

                    signUp(
                      String(data.get('email')),
                      String(data.get('password')),
                      String(data.get('fullName')),
                      String(data.get('country')),
                      String(data.get('division'))
                    );
                  }}
                >
                  <h2>Create Your WFMS Account</h2>

                  <label>Full Name</label>
                  <input
                    name="fullName"
                    placeholder="Your full name"
                    required
                  />

                  <label>Email Address</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="Your email"
                    required
                  />

                  <label>Password</label>
                  <input
                    name="password"
                    type="password"
                    minLength={6}
                    placeholder="Create a password"
                    required
                  />

                  <label>Country</label>
                  <input name="country" placeholder="Your country" required />

                  <label>Research Division</label>
                  <select name="division" required defaultValue="">
                    <option value="" disabled>
                      Select division
                    </option>
                    {divisions.map((item) => (
                      <option key={item.shortName} value={item.shortName}>
                        {item.shortName}
                      </option>
                    ))}
                  </select>

                  <button className="gold-button" type="submit" disabled={busy}>
                    {busy ? 'Creating Account...' : 'Create Account'}
                  </button>

                  <p>
                    Registration does not automatically grant executive
                    permissions or approved membership.
                  </p>
                </form>
              )}
            </>
          ) : (
            <>
              {heading(
                'YOUR WFMS MEMBERSHIP',
                'Member Dashboard',
                'Your personal research and membership workspace.'
              )}

              <div className="profile-card">
                <div className="profile-avatar">
                  {(user.user_metadata?.full_name || 'W')
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2>{user.user_metadata?.full_name || 'WFMS Member'}</h2>
                  <p>{user.email}</p>
                  <span className="eyebrow">{currentRole.toUpperCase()}</span>
                </div>

                <button
                  className="outline-button"
                  onClick={() => navigate('editProfile')}
                >
                  Edit Profile
                </button>

                <button className="outline-button" onClick={signOut}>
                  Sign Out
                </button>
              </div>

              <div className="profile-grid">
                <div className="content-block">
                  <h2>Personal Information</h2>
                  <p>
                    <strong>Full Name</strong>
                  </p>
                  <p>{user.user_metadata?.full_name || 'Not added'}</p>
                  <p>
                    <strong>Email</strong>
                  </p>
                  <p>{user.email}</p>
                  <p>
                    <strong>Country</strong>
                  </p>
                  <p>{user.user_metadata?.country || 'Not added'}</p>
                </div>

                <div className="content-block">
                  <h2>Membership</h2>
                  <p>Account: Authenticated</p>
                  <p>Membership approval: Pending database verification</p>
                  <p>Member ID: Awaiting assignment</p>
                </div>

                <div className="content-block">
                  <h2>My Division</h2>
                  <p>{user.user_metadata?.division || 'Not assigned'}</p>
                </div>
              </div>

              <h2>My Workspace</h2>
              {portalCards()}

              {renderResearchSubmissions()}

              {isCEO && (
                <div className="content-block">
                  <h2>Founder & CEO Access</h2>
                  <p>Executive administration workspace.</p>
                  <button
                    className="gold-button"
                    onClick={() => navigate('ceo')}
                  >
                    Open Executive Office →
                  </button>
                </div>
              )}

              {isExecutive && !isCEO && (
                <div className="content-block">
                  <h2>Executive Director Access</h2>
                  <button
                    className="gold-button"
                    onClick={() => navigate('executive')}
                  >
                    Open Executive Dashboard →
                  </button>
                </div>
              )}

              {isEditorial && !isCEO && (
                <div className="content-block">
                  <h2>Editorial Access</h2>
                  <button
                    className="outline-button"
                    onClick={() => navigate('editorial')}
                  >
                    Open Editorial Workspace →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* EDIT PROFILE */}

      {page === 'editProfile' && (
        <main className="inner-page account-page">
          <button
            className="outline-button"
            onClick={() => navigate('account')}
          >
            ← Back to My Profile
          </button>

          {heading(
            'ACCOUNT SETTINGS',
            'Edit Profile',
            'Update your personal information.'
          )}

          {!user ? (
            <p>Please sign in first.</p>
          ) : (
            <form className="content-block" onSubmit={saveProfile}>
              <label>Full Name</label>
              <input
                name="fullName"
                defaultValue={user.user_metadata?.full_name || ''}
                required
              />

              <label>Email Address</label>
              <input value={user.email || ''} readOnly />

              <label>Country</label>
              <input
                name="country"
                defaultValue={user.user_metadata?.country || ''}
                required
              />

              <label>Research Division</label>
              <select
                name="division"
                defaultValue={user.user_metadata?.division || ''}
                required
              >
                {divisions.map((item) => (
                  <option key={item.shortName} value={item.shortName}>
                    {item.shortName}
                  </option>
                ))}
              </select>

              <button className="gold-button" type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}
        </main>
      )}

      {/* CEO DASHBOARD */}

      {page === 'ceo' && (
        <main className="inner-page account-page">
          <button
            className="outline-button"
            onClick={() => navigate('account')}
          >
            ← Back to Account
          </button>

          {heading(
            'EXECUTIVE OFFICE',
            'Founder & CEO Dashboard',
            'Organisational administration and strategic leadership.'
          )}

          {!isCEO ? (
            <div className="content-block">
              <h2>Access Restricted</h2>
              <p>
                This workspace is reserved for authorised executive leadership.
              </p>
            </div>
          ) : (
            <>
              <div className="profile-card">
                <div className="profile-avatar">W</div>
                <div>
                  <h2>{user.user_metadata?.full_name || 'Founder & CEO'}</h2>
                  <p>Chief Executive Officer · WFMS</p>
                  <span className="eyebrow">EXECUTIVE LEADERSHIP</span>
                </div>
              </div>

              <div className="profile-grid">
                <button
                  className="content-block clickable-card"
                  onClick={() => navigate('members')}
                >
                  <h2>Member Management →</h2>
                  <p>Review membership and member administration.</p>
                </button>

                <button
                  className="content-block clickable-card"
                  onClick={() => navigate('executive')}
                >
                  <h2>Executive Directors →</h2>
                  <p>
                    Executive leadership and organisational responsibilities.
                  </p>
                </button>

                <button
                  className="content-block clickable-card"
                  onClick={() => navigate('editorial')}
                >
                  <h2>Editorial Board →</h2>
                  <p>Publication governance and editorial operations.</p>
                </button>

                <button
                  className="content-block clickable-card"
                  onClick={() => navigate('research')}
                >
                  <h2>Research Divisions →</h2>
                  <p>Oversee Finance, Marketing, Trade and Economics.</p>
                </button>

                <button
                  className="content-block clickable-card"
                  onClick={() => navigate('contact')}
                >
                  <h2>Partnerships →</h2>
                  <p>Institutional partnerships and collaborations.</p>
                </button>

                <div className="content-block">
                  <h2>Financial Overview</h2>
                  <p>Donations, revenue, expenses and financial reports.</p>
                  <p>
                    Financial records require a connected payment and database
                    integration.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      )}

      {/* EXECUTIVE DIRECTORS */}

      {page === 'executive' && (
        <main className="inner-page">
          <button
            className="outline-button"
            onClick={() => navigate('account')}
          >
            ← Back to Account
          </button>

          {heading(
            'ORGANISATIONAL LEADERSHIP',
            'Executive Dashboard',
            'Executive coordination and research administration.'
          )}

          {!isExecutive ? (
            emptyState(
              'Access Restricted',
              'Executive permissions are required.'
            )
          ) : (
            <div className="profile-grid">
              <div className="content-block">
                <h2>Membership Administration</h2>
                <p>Review applications and membership records.</p>
              </div>
              <div className="content-block">
                <h2>Research Divisions</h2>
                <p>Coordinate all four divisions and their directors.</p>
              </div>
              <div className="content-block">
                <h2>Research Proposals</h2>
                <p>Coordinate initial proposal reviews.</p>
              </div>
              <div className="content-block">
                <h2>Leadership Appointments</h2>
                <p>Coordinate organisational leadership.</p>
              </div>
              <div className="content-block">
                <h2>Editorial Coordination</h2>
                <p>Coordinate with the Editorial Board.</p>
              </div>
              <div className="content-block">
                <h2>Meetings & Announcements</h2>
                <p>Organisational communication and planning.</p>
              </div>
            </div>
          )}
        </main>
      )}

      {/* EDITORIAL BOARD */}

      {page === 'editorial' && (
        <main className="inner-page">
          <button
            className="outline-button"
            onClick={() => navigate('account')}
          >
            ← Back to Account
          </button>

          {heading(
            'PUBLICATION GOVERNANCE',
            'Editorial Workspace',
            'Research evaluation and publication integrity.'
          )}

          {!isEditorial ? (
            emptyState(
              'Access Restricted',
              'Editorial permissions are required.'
            )
          ) : (
            <>
              <div className="content-block">
                <h2>Publication Authority</h2>
                <p>The Editorial Board holds final publication authority.</p>
              </div>

              <div className="content-block">
                <h2>Research Review</h2>
                <p>
                  Review research for originality, relevance, quality and
                  academic integrity.
                </p>
              </div>

              <div className="content-block">
                <h2>Publication Decisions</h2>
                <p>
                  Final approval, revision requests and publication decisions.
                </p>
              </div>

              <div className="content-block">
                <h2>Research Archive</h2>
                <p>Approved papers and completed publications.</p>
              </div>
            </>
          )}
        </main>
      )}

      {/* MEMBER MANAGEMENT */}

      {page === 'members' && (
        <main className="inner-page">
          <button className="outline-button" onClick={() => navigate('ceo')}>
            ← Back to Executive Office
          </button>

          {heading(
            'MEMBERSHIP ADMINISTRATION',
            'Member Management',
            'Membership applications and organisational records.'
          )}

          {!isCEO ? (
            emptyState('Access Restricted', 'CEO permissions are required.')
          ) : (
            <>
              <div className="content-block">
                <h2>Membership Applications</h2>
                <p>
                  New membership applications will appear here once the
                  membership approval workflow is connected.
                </p>
              </div>

              <div className="content-block">
                <h2>Approved Members</h2>
                <p>Approved member records and membership information.</p>
              </div>

              <div className="content-block">
                <h2>Membership Administration</h2>
                <p>Member roles, divisions and membership status.</p>
              </div>
            </>
          )}
        </main>
      )}

      {/* FOOTER */}

      <footer className="footer">
        <h2>WFMS</h2>
        <p>World Finance and Marketing Society</p>
        <p>Advancing Knowledge. Building a Global Future.</p>

        <div className="footer-links">
          <button onClick={() => navigate('about')}>About</button>
          <button onClick={() => navigate('research')}>Research</button>
          <button onClick={() => navigate('governance')}>Governance</button>
          <button onClick={() => navigate('contact')}>Contact</button>
          <button onClick={() => navigate('account')}>My Account</button>
        </div>

        <small>© 2026 WFMS. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default App;
