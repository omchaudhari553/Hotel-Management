import React, { useEffect, useState } from 'react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';
import { superAdminApi, SupportTicketItem, BusinessSummary } from '../superAdminApi';
import {
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Send,
  CheckCircle2,
  X,
  Plus,
  Search,
  Filter,
  UserCheck,
  Lock,
  ShieldAlert,
  Clock,
  AlertTriangle,
  FileText,
  CornerDownRight,
  Shield,
  Eye,
  LogOut,
  Sparkles
} from 'lucide-react';

const SUPPORT_STAFF = [
  { id: 'STF-01', name: 'Rahul Verma (Support Lead)' },
  { id: 'STF-02', name: 'Priya Deshmukh (Billing Specialist)' },
  { id: 'STF-03', name: 'Amit Patil (Technical Support Engineer)' },
  { id: 'STF-04', name: 'Neha Joshi (POS Operations Support)' }
];

export const SupportManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useSuperAdminPopup();
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Selected Ticket Drawer
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [replyTab, setReplyTab] = useState<'PUBLIC_REPLY' | 'INTERNAL_NOTE'>('PUBLIC_REPLY');
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Create Ticket Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    businessId: 1,
    subject: '',
    priority: 'MEDIUM',
    category: 'BILLING_INVOICE',
    description: '',
    assignedTo: 'Rahul Verma (Support Lead)'
  });

  // Controlled Support Access Session (Impersonation Guard)
  const [showSupportAccessModal, setShowSupportAccessModal] = useState(false);
  const [supportAccessTarget, setSupportAccessTarget] = useState<SupportTicketItem | null>(null);
  const [supportAccessReason, setSupportAccessReason] = useState('');
  const [supportAccessDuration, setSupportAccessDuration] = useState<15 | 30 | 60>(15);
  const [authorizedConsent, setAuthorizedConsent] = useState(false);
  const [activeSupportSession, setActiveSupportSession] = useState<{
    businessName: string;
    reason: string;
    expiresAt: number;
    timerText: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketData, bizData] = await Promise.all([
        superAdminApi.getTickets(),
        superAdminApi.getBusinesses()
      ]);
      setTickets(ticketData);
      setBusinesses(bizData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFullPageRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      window.location.reload();
    }, 120);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Timer for Controlled Support Access Session
  useEffect(() => {
    if (!activeSupportSession) return;
    const interval = setInterval(() => {
      const remainingSec = Math.max(0, Math.floor((activeSupportSession.expiresAt - Date.now()) / 1000));
      if (remainingSec <= 0) {
        setActiveSupportSession(null);
        showAlert('Controlled Support Session has expired and access token is revoked.', 'Session Expired', 'info');
      } else {
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        setActiveSupportSession((prev) => prev ? {
          ...prev,
          timerText: `${mins}:${secs < 10 ? '0' : ''}${secs}`
        } : null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSupportSession]);

  const openTicketDetails = async (id: number) => {
    try {
      const detail = await superAdminApi.getSupportTicketById(id);
      setSelectedTicket(detail);
    } catch (e) {
      console.error(e);
    }
  };

  // Reply or Internal Note Submit
  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSending(true);
    try {
      const isInternal = replyTab === 'INTERNAL_NOTE';
      await superAdminApi.replyTicket(selectedTicket.id, `${isInternal ? '[INTERNAL NOTE] ' : ''}${replyMessage.trim()}`);
      setReplyMessage('');
      openTicketDetails(selectedTicket.id);
      showAlert(
        isInternal ? 'Internal staff note added to ticket history.' : 'Reply delivered to customer.',
        isInternal ? 'Note Saved' : 'Reply Sent',
        'success'
      );
      loadData();
    } catch (err: any) {
      showAlert('Failed to post response: ' + (err.message || 'Error'), 'Error', 'error');
    } finally {
      setSending(false);
    }
  };

  // Update Status
  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      await superAdminApi.updateTicketStatus(ticketId, newStatus);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus as any });
      }
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus as any } : t))
      );
      showAlert(`Ticket status changed to ${newStatus}.`, 'Status Updated', 'info');
    } catch (err: any) {
      showAlert('Failed to update status.', 'Error', 'error');
    }
  };

  // Assign Ticket to Staff
  const handleAssignStaff = async (ticketId: number, staffName: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, assignedTo: staffName } : t))
    );
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, assignedTo: staffName });
    }
    showAlert(`Ticket assigned to ${staffName}.`, 'Assigned', 'success');
  };

  // Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.subject.trim() || !createForm.description.trim()) {
      showAlert('Subject and description are required.', 'Missing Fields', 'warning');
      return;
    }

    try {
      const selectedBiz = businesses.find((b) => b.id === Number(createForm.businessId));
      await superAdminApi.createTicket({
        businessId: Number(createForm.businessId),
        subject: createForm.subject,
        priority: createForm.priority,
        description: createForm.description
      });
      setShowCreateModal(false);
      setCreateForm({
        businessId: 1,
        subject: '',
        priority: 'MEDIUM',
        category: 'BILLING_INVOICE',
        description: '',
        assignedTo: 'Rahul Verma (Support Lead)'
      });
      showAlert(`New support ticket for "${selectedBiz?.name || 'Customer'}" generated.`, 'Ticket Created', 'success');
      loadData();
    } catch (err: any) {
      showAlert('Failed to create ticket: ' + (err.message || 'Error'), 'Error', 'error');
    }
  };

  // Controlled Support Access Authorization
  const handleInitiateSupportAccess = () => {
    if (!supportAccessTarget) return;
    if (!supportAccessReason.trim()) {
      showAlert('An explicit troubleshooting reason or customer ticket reference is required.', 'Reason Required', 'warning');
      return;
    }
    if (!authorizedConsent) {
      showAlert('Please acknowledge that this controlled session will be recorded in platform audit logs.', 'Consent Required', 'warning');
      return;
    }

    const expiresAt = Date.now() + supportAccessDuration * 60 * 1000;
    const mins = supportAccessDuration;
    setActiveSupportSession({
      businessName: supportAccessTarget.businessName,
      reason: supportAccessReason,
      expiresAt,
      timerText: `${mins}:00`
    });

    setShowSupportAccessModal(false);
    showAlert(
      `Controlled Support Access initiated for "${supportAccessTarget.businessName}". Session duration: ${supportAccessDuration} minutes. Logged in audit registry.`,
      'Support Session Active',
      'success'
    );
  };

  // Terminate Controlled Support Access
  const handleEndSupportSession = () => {
    showConfirm(
      'Terminate controlled support access session now and revoke temporary credentials?',
      () => {
        setActiveSupportSession(null);
        showAlert('Controlled Support Session terminated successfully.', 'Session Closed', 'info');
      },
      'End Session',
      'End Support Session'
    );
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* ACTIVE CONTROLLED SUPPORT SESSION BANNER */}
      {activeSupportSession && (
        <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>Controlled Support Session Active</span>
                <span className="text-[11px] font-mono bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  Time Left: {activeSupportSession.timerText}
                </span>
              </p>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Target: <strong>{activeSupportSession.businessName}</strong> • Reason: "{activeSupportSession.reason}". Access is visibly badged and logged.
              </p>
            </div>
          </div>
          <button
            onClick={handleEndSupportSession}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>End Support Session</span>
          </button>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Support & Complaints Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Resolve customer queries, assign tickets, add internal notes vs customer replies, and initiate controlled troubleshooting sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Full Page Refresh Button (38px height) */}
          <button
            type="button"
            onClick={handleFullPageRefresh}
            disabled={loading}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '10px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              color: '#E2E8F0',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E293B'; }}
            title="Refresh Entire Page"
          >
            <RefreshCw
              style={{
                width: '15px',
                height: '15px',
                color: '#818CF8',
                animation: loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '10px',
              backgroundColor: '#4F46E5',
              border: '1px solid #6366F1',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxSizing: 'border-box',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4338CA'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4F46E5'; }}
          >
            <Plus className="w-4 h-4" />
            <span>Create Support Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 focus-within:ring-1 focus-within:ring-indigo-500 gap-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by subject, business name, or ticket number..."
            className="w-full bg-transparent border-0 p-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Assigned Staff</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Loading customer support queue...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No support tickets matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-indigo-400 font-bold">
                      {t.ticketNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{t.businessName}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium max-w-xs truncate">
                      {t.subject}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={t.assignedTo || 'Unassigned'}
                        onChange={(e) => handleAssignStaff(t.id, e.target.value)}
                        className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="Unassigned">Unassigned</option>
                        {SUPPORT_STAFF.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.priority === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : t.priority === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border bg-slate-950 cursor-pointer focus:outline-none ${
                          t.status === 'RESOLVED' || t.status === 'CLOSED'
                            ? 'text-emerald-400 border-emerald-500/30'
                            : t.status === 'IN_PROGRESS'
                            ? 'text-indigo-400 border-indigo-500/30'
                            : t.status === 'WAITING_FOR_CUSTOMER'
                            ? 'text-amber-400 border-amber-500/30'
                            : 'text-cyan-400 border-cyan-500/30'
                        }`}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openTicketDetails(t.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Respond</span>
                        </button>

                        {/* Controlled Support Access Trigger */}
                        <button
                          onClick={() => {
                            setSupportAccessTarget(t);
                            setSupportAccessReason(`Troubleshooting ${t.ticketNumber}: ${t.subject}`);
                            setShowSupportAccessModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all"
                          title="Controlled Support Access (Audit-Logged Troubleshooting)"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Open Customer Support Ticket</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Target Business Customer *</label>
                <select
                  value={createForm.businessId}
                  onChange={(e) => setCreateForm({ ...createForm, businessId: Number(e.target.value) })}
                  className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.ownerName || 'Owner'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Subject / Issue Summary *</label>
                <input
                  type="text"
                  required
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  placeholder="e.g. GST invoice mismatch on Table 04 order"
                  className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL (System Down)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Initial Assignment</label>
                  <select
                    value={createForm.assignedTo}
                    onChange={(e) => setCreateForm({ ...createForm, assignedTo: e.target.value })}
                    className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {SUPPORT_STAFF.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Issue Details / Customer Message *</label>
                <textarea
                  required
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe the complaint or troubleshooting requirement in detail..."
                  className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 -mx-6 -mb-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                >
                  Generate Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET DETAILS & REPLY DRAWER MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedTicket.subject}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ticket #{selectedTicket.ticketNumber} • Customer: <strong>{selectedTicket.businessName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Info Strip */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-500 block">Status:</span>
                <span className="text-white font-bold">{selectedTicket.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Priority:</span>
                <span className="text-amber-400 font-bold">{selectedTicket.priority}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Assigned Staff:</span>
                <span className="text-indigo-300 font-bold">{selectedTicket.assignedTo || 'Unassigned'}</span>
              </div>
            </div>

            {/* Conversation History Thread */}
            <div className="space-y-3 max-h-64 overflow-y-auto p-2">
              {/* Initial ticket prompt */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-bold text-slate-400">{selectedTicket.businessName} (Customer Initial Issue)</span>
                  <span>{selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : 'Recent'}</span>
                </div>
                <p className="text-xs text-slate-200">{selectedTicket.description || 'Customer submitted troubleshooting inquiry.'}</p>
              </div>

              {/* Replies and Internal Notes */}
              {selectedTicket.replies?.map((r) => {
                const isInternal = r.message.startsWith('[INTERNAL NOTE]');
                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border space-y-1 ${
                      isInternal
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-indigo-500/10 border-indigo-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold flex items-center gap-1 ${isInternal ? 'text-amber-400' : 'text-indigo-400'}`}>
                        {isInternal ? <Lock className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                        {isInternal ? 'Internal Staff Note' : `${r.senderName} (Support)`}
                      </span>
                      <span className="text-slate-500">{new Date(r.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className={`text-xs ${isInternal ? 'text-amber-200' : 'text-slate-200'}`}>
                      {r.message.replace('[INTERNAL NOTE] ', '')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Response Box with Public Reply vs Internal Note Tabs */}
            <form onSubmit={handleSendResponse} className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setReplyTab('PUBLIC_REPLY')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    replyTab === 'PUBLIC_REPLY'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reply to Customer
                </button>
                <button
                  type="button"
                  onClick={() => setReplyTab('INTERNAL_NOTE')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    replyTab === 'INTERNAL_NOTE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Internal Staff Note (Private)</span>
                </button>
              </div>

              <textarea
                required
                rows={3}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder={
                  replyTab === 'INTERNAL_NOTE'
                    ? 'Write a private note visible only to Super Admin and support staff...'
                    : 'Write a response that will be sent directly to the customer...'
                }
                className={`w-full bg-slate-950 text-white border rounded-xl p-3 text-xs focus:outline-none ${
                  replyTab === 'INTERNAL_NOTE' ? 'border-amber-500/40 focus:border-amber-500' : 'border-slate-800 focus:border-indigo-500'
                }`}
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {replyTab === 'INTERNAL_NOTE' ? '⚠️ Internal notes are NEVER shown to the business customer.' : 'Customer will receive in-app notification.'}
                </span>
                <button
                  type="submit"
                  disabled={sending}
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg ${
                    replyTab === 'INTERNAL_NOTE'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  }`}
                >
                  {sending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{replyTab === 'INTERNAL_NOTE' ? 'Save Internal Note' : 'Send Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTROLLED SUPPORT ACCESS MODAL (IMPERSONATION GUARD) */}
      {showSupportAccessModal && supportAccessTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Controlled Support Access Request</h3>
              </div>
              <button
                onClick={() => setShowSupportAccessModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl space-y-1">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Security Compliance & Privacy Standard</span>
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Super Admin cannot silently impersonate customers. Controlled access provides a time-limited troubleshooting session with visible access indicators on the tenant portal and permanent audit logs.
                </p>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Target Account</label>
                <p className="text-white font-bold bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {supportAccessTarget.businessName} (Ticket #{supportAccessTarget.ticketNumber})
                </p>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Troubleshooting Reason / Ticket Reference *</label>
                <input
                  type="text"
                  required
                  value={supportAccessReason}
                  onChange={(e) => setSupportAccessReason(e.target.value)}
                  className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Session Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSupportAccessDuration(mins as any)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                        supportAccessDuration === mins
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorizedConsent}
                  onChange={(e) => setAuthorizedConsent(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300">
                  I certify that this support session is explicitly authorized to diagnose customer issue <strong>{supportAccessTarget.ticketNumber}</strong>, and understand all interactions will be immutably recorded.
                </span>
              </label>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSupportAccessModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInitiateSupportAccess}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-600/30"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Authorize & Begin Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
