import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabase/config";
import { useAuth } from "../../../context/AuthContext";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { useToast } from "../../ui/Toast";
import { LifeBuoy, Send, MessageSquare, Plus, Loader2, ArrowLeft, Clock, User, ShieldAlert } from "lucide-react";

interface SupportMessage {
  sender: "customer" | "support";
  message: string;
  timestamp: any;
}

interface SupportTicket {
  id: string;
  customerEmail: string;
  customerName: string;
  businessId: string;
  ownerUid: string;
  title: string;
  category: "billing" | "technical" | "general" | "delivery";
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high";
  description: string;
  createdAt: any;
  messages: SupportMessage[];
}

export function PortalSupport() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // New ticket form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"billing" | "technical" | "general" | "delivery">("billing");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("low");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New message form state
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const ticketsList = data.map(d => ({
          id: d.id,
          customerEmail: d.customer_email,
          customerName: d.customer_name,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          title: d.title,
          category: d.category,
          status: d.status,
          priority: d.priority,
          description: d.description,
          createdAt: d.created_at ? new Date(d.created_at) : new Date(),
          messages: d.messages || []
        } as SupportTicket));

        setTickets(ticketsList);
        if (activeTicket) {
          const updatedActive = ticketsList.find(t => t.id === activeTicket.id);
          if (updatedActive) setActiveTicket(updatedActive);
        }
      }
    } catch (err) {
      console.error("Error fetching support tickets:", err);
      toast.error("Fetch Failed", "Could not load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Form Incomplete", "Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      let businessId: string | null = null;
      let ownerUid: string | null = null;

      const { data: docData } = await supabase
        .from('sales_documents')
        .select('business_id, owner_uid')
        .limit(1)
        .maybeSingle();

      if (docData) {
        businessId = docData.business_id;
        ownerUid = docData.owner_uid;
      } else {
        const { data: bizData } = await supabase
          .from('businesses')
          .select('id, owner_uid')
          .limit(1)
          .maybeSingle();
        if (bizData) {
          businessId = bizData.id;
          ownerUid = bizData.owner_uid;
        }
      }

      if (!businessId || !ownerUid) {
        toast.error("Support Unavailable", "No active business context found for submitting support tickets.");
        setSubmitting(false);
        return;
      }

      const initialMsg = {
        sender: "customer",
        message: description,
        timestamp: new Date()
      };

      await supabase.from('support_tickets').insert({
        customer_email: user.email,
        customer_name: user.displayName || user.email.split("@")[0],
        business_id: businessId,
        owner_uid: ownerUid,
        title,
        category,
        priority,
        status: "open",
        description,
        messages: [initialMsg]
      });

      toast.success("Ticket Opened", "Support ticket opened successfully. Support team notified.");
      setIsCreating(false);
      setTitle("");
      setDescription("");
      
      await fetchTickets();
    } catch (err) {
      console.error("Error creating support ticket:", err);
      toast.error("Creation Failed", "Could not create support ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !newMessage.trim()) return;

    setSendingMsg(true);
    try {
      const newMsgObj = {
        sender: "customer" as const,
        message: newMessage.trim(),
        timestamp: new Date()
      };

      const updatedMessages = [...(activeTicket.messages || []), newMsgObj];

      await supabase
        .from('support_tickets')
        .update({
          messages: updatedMessages,
          status: "open"
        })
        .eq('id', activeTicket.id);

      setNewMessage("");
      await fetchTickets();
      toast.success("Message Sent", "Your reply was posted successfully.");
    } catch (err) {
      console.error("Error sending message to ticket:", err);
      toast.error("Send Failed", "Could not post your reply.");
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-indigo-500" />
            Support Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">Submit requests, track issues, and converse with our helpdesk.</p>
        </div>

        {!activeTicket && !isCreating && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreating(true)}
          >
            New Support Ticket
          </Button>
        )}
      </div>

      {/* CREATING NEW TICKET */}
      {isCreating && (
        <Card className="max-w-2xl mx-auto p-6 border-slate-200/60 dark:border-slate-800 shadow-md">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-6 cursor-pointer text-sm" onClick={() => setIsCreating(false)}>
            <ArrowLeft className="w-4 h-4" /> Back to Support Desk
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Open Support Request</h3>

          <form onSubmit={handleCreateTicket} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="billing">Invoicing & Billing</option>
                  <option value="technical">Technical Support</option>
                  <option value="delivery">Product / Service Delivery</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase">Priority</label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low (Standard SLA)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Urgent)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase">Subject / Brief Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Discrepancy on Invoice #GAT-2026-004 pricing"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase">Detailed Description</label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe your query or problem in detail. Include item references or billing numbers where applicable."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Submit Request
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TICKET DETAILS & CHAT THREAD */}
      {activeTicket && !isCreating && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Back button and Meta panel */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5 border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold cursor-pointer text-sm mb-2" onClick={() => setActiveTicket(null)}>
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </div>

              <div>
                <span className="text-[10px] font-bold text-indigo-500 uppercase">Ticket ID</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-sm break-all">{activeTicket.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
                  <Badge variant="default" className="mt-1 uppercase text-[10px]">{activeTicket.category}</Badge>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority</span>
                  <Badge variant={activeTicket.priority === "high" ? "danger" : activeTicket.priority === "medium" ? "warning" : "default"} className="mt-1 uppercase text-[10px]">{activeTicket.priority}</Badge>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</span>
                <Badge variant={activeTicket.status === "resolved" ? "primary" : activeTicket.status === "in_progress" ? "warning" : "default"}>
                  {activeTicket.status === "resolved" ? "Resolved" : activeTicket.status === "in_progress" ? "In Progress" : "Open"}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Opened On</span>
                <p className="text-slate-700 dark:text-slate-300 text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {activeTicket.createdAt?.toLocaleDateString()} {activeTicket.createdAt?.toLocaleTimeString()}
                </p>
              </div>
            </Card>
          </div>

          {/* Conversation Thread */}
          <Card className="lg:col-span-8 p-6 border-slate-200/60 dark:border-slate-800 shadow-md flex flex-col min-h-[500px]">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{activeTicket.title}</h3>
            </div>

            {/* Message Feed */}
            <div className="flex-grow space-y-4 overflow-y-auto max-h-[350px] pr-2 mb-4 scrollbar-thin">
              {activeTicket.messages?.map((msg, idx) => {
                const isCustomer = msg.sender === "customer";
                const msgTime = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                
                return (
                  <div key={idx} className={`flex items-start gap-2.5 ${isCustomer ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white ${isCustomer ? "bg-indigo-600" : "bg-emerald-600"}`}>
                      {isCustomer ? <User className="w-4 h-4" /> : <LifeBuoy className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1 max-w-[80%]">
                      <div className={`p-3.5 rounded-2xl text-xs sm:text-sm ${isCustomer ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-150 rounded-tl-none"}`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className={`text-[10px] text-slate-400 ${isCustomer ? "text-right" : "text-left"}`}>
                        {isCustomer ? "You" : "Support Helpdesk"} • {msgTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Form */}
            {activeTicket.status !== "resolved" ? (
              <form onSubmit={handleSendMessage} className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-auto">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply to the helpdesk..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl pl-3 pr-12 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                  <div className="absolute right-2 bottom-3">
                    <Button
                      variant="primary"
                      type="submit"
                      icon={<Send className="w-3.5 h-3.5" />}
                      disabled={!newMessage.trim() || sendingMsg}
                      className="rounded-lg py-1.5 px-3"
                    />
                  </div>
                </div>
              </form>
            ) : (
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-auto text-center bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl flex flex-col items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-indigo-500 mb-1" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">This ticket is marked as Resolved.</p>
                <p className="text-[10px] text-slate-400">You can open a new request if you need further assistance.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* LIST OF TICKETS */}
      {!activeTicket && !isCreating && (
        <Card className="p-0 overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm">
          {tickets.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Support Tickets</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Need help? Open a support ticket, and our business operations team will respond promptly.</p>
              <Button variant="outline" onClick={() => setIsCreating(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                Open Ticket
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Ticket ID</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Subject</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Category</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Priority</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 cursor-pointer transition-colors" onClick={() => setActiveTicket(ticket)}>
                      <td className="p-4 font-mono font-bold text-indigo-600 text-xs truncate max-w-[100px]">{ticket.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{ticket.title}</div>
                        <div className="text-[10px] text-slate-400">Opened {ticket.createdAt?.toLocaleDateString()}</div>
                      </td>
                      <td className="p-4 uppercase text-[10px] font-semibold text-slate-500">{ticket.category}</td>
                      <td className="p-4">
                        <Badge variant={ticket.status === "resolved" ? "primary" : ticket.status === "in_progress" ? "warning" : "default"}>
                          {ticket.status === "resolved" ? "resolved" : ticket.status === "in_progress" ? "in progress" : "open"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={ticket.priority === "high" ? "danger" : ticket.priority === "medium" ? "warning" : "default"} className="uppercase text-[9px]">
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" icon={<MessageSquare className="w-3.5 h-3.5" />}>Chat</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
