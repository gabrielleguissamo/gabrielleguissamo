import { useState, useEffect } from 'react'
import { Search, Plus, X, Upload, Download, Trash2, FileText, Calendar, DollarSign, ClipboardList } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Patient, MedicalRecord, PatientDocument, AppSession, Transaction } from '../../types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatBytes(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Prontuarios() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [historySessions, setHistorySessions] = useState<AppSession[]>([])
  const [historyTransactions, setHistoryTransactions] = useState<Transaction[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('evolucao')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [form, setForm] = useState({ date: '', session_type: 'Presencial', content: '', record_type: 'evolucao' as 'evolucao' | 'avaliacao' })

  async function fetchPatients() {
    if (!user) return
    setLoadingPatients(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
    if (!error && data) {
      const list = data as Patient[]
      setPatients(list)
      // Pre-select from URL param
      const paramId = searchParams.get('patient')
      if (paramId) {
        const found = list.find(p => p.id === paramId)
        if (found) setSelected(found)
        else if (list.length > 0) setSelected(list[0])
      } else if (list.length > 0) {
        setSelected(list[0])
      }
    }
    setLoadingPatients(false)
  }

  async function fetchRecords(patientId: string) {
    setLoadingRecords(true)
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) {
      setToast({ message: 'Erro ao carregar evoluções', type: 'error' })
    } else {
      setRecords((data ?? []) as MedicalRecord[])
    }
    setLoadingRecords(false)
  }

  async function fetchDocuments(patientId: string) {
    setLoadingDocuments(true)
    const { data, error } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (error) {
      setToast({ message: 'Erro ao carregar documentos', type: 'error' })
    } else {
      setDocuments((data ?? []) as PatientDocument[])
    }
    setLoadingDocuments(false)
  }

  async function fetchHistory(patientId: string) {
    setLoadingHistory(true)
    const [sessionsRes, transactionsRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
      supabase.from('transactions').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
    ])
    setHistorySessions((sessionsRes.data ?? []) as AppSession[])
    setHistoryTransactions((transactionsRes.data ?? []) as Transaction[])
    setLoadingHistory(false)
  }

  useEffect(() => { fetchPatients() }, [user])
  useEffect(() => {
    if (selected) {
      fetchRecords(selected.id)
      fetchDocuments(selected.id)
      fetchHistory(selected.id)
    }
  }, [selected])

  async function handleSaveRecord() {
    if (!user || !selected || !form.content) return
    setSaving(true)
    const { error } = await supabase.from('records').insert({
      patient_id: selected.id,
      user_id: user.id,
      date: form.date || new Date().toISOString().slice(0, 10),
      content: form.content,
      assessment_type: form.session_type,
      record_type: form.record_type,
    })
    setSaving(false)
    if (error) {
      setToast({ message: 'Erro ao salvar', type: 'error' })
    } else {
      setToast({ message: form.record_type === 'avaliacao' ? 'Avaliação salva!' : 'Evolução salva!', type: 'success' })
      setShowModal(false)
      setForm({ date: '', session_type: 'Presencial', content: '', record_type: 'evolucao' })
      if (selected) fetchRecords(selected.id)
    }
  }

  async function handleUploadDocument(file: File) {
    if (!user || !selected) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${selected.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
    if (uploadError) {
      setUploading(false)
      setToast({ message: 'Erro ao enviar documento', type: 'error' })
      return
    }
    const { error } = await supabase.from('patient_documents').insert({
      user_id: user.id,
      patient_id: selected.id,
      name: file.name,
      file_path: path,
      file_type: ext ?? null,
      size: file.size,
    })
    setUploading(false)
    if (error) {
      setToast({ message: 'Erro ao registrar documento', type: 'error' })
    } else {
      setToast({ message: 'Documento enviado!', type: 'success' })
      fetchDocuments(selected.id)
    }
  }

  async function handleDownloadDocument(doc: PatientDocument) {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (error || !data) {
      setToast({ message: 'Erro ao abrir documento', type: 'error' })
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDeleteDocument(doc: PatientDocument) {
    if (!window.confirm('Excluir este documento?')) return
    await supabase.storage.from('documents').remove([doc.file_path])
    const { error } = await supabase.from('patient_documents').delete().eq('id', doc.id)
    if (error) {
      setToast({ message: 'Erro ao excluir documento', type: 'error' })
    } else {
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      setToast({ message: 'Documento excluído', type: 'success' })
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR')
  }

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 h-full">
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        <Card className="w-72 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-5" />
              <input
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingPatients ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${selected?.id === p.id ? 'bg-green-10' : 'hover:bg-gray-50'}`}
              >
                <p className={`text-sm font-medium ${selected?.id === p.id ? 'text-green-700' : 'text-ink'}`}>{p.name}</p>
                <p className="text-xs text-ink-5 truncate">{p.diagnosis ?? '—'}</p>
              </button>
            ))}
            {!loadingPatients && filtered.length === 0 && (
              <p className="text-xs text-ink-5 text-center py-8">Nenhum paciente encontrado.</p>
            )}
          </div>
        </Card>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="p-5 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-ink">{selected.name}</h2>
                    <p className="text-sm text-ink-4">{selected.diagnosis ?? '—'}</p>
                  </div>
                  {activeTab === 'documentos' ? (
                    <label className={`inline-flex items-center justify-center gap-2 h-12 px-6 font-bold text-sm rounded-[100px] cursor-pointer transition-all duration-200 ${uploading ? 'opacity-50 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-400 active:bg-green-600'}`}>
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadDocument(file)
                          e.target.value = ''
                        }}
                      />
                      <Upload className="w-4 h-4" /> {uploading ? 'Enviando...' : 'Enviar documento'}
                    </label>
                  ) : activeTab === 'historico' ? null : (
                    <Button onClick={() => { setForm(f => ({ ...f, record_type: activeTab === 'avaliacoes' ? 'avaliacao' : 'evolucao' })); setShowModal(true) }}>
                      <Plus className="w-4 h-4" /> {activeTab === 'avaliacoes' ? 'Nova avaliação' : 'Nova evolução'}
                    </Button>
                  )}
                </div>
                <div className="flex gap-1 mt-4">
                  {[['evolucao', 'Evolução'], ['avaliacoes', 'Avaliações'], ['documentos', 'Documentos'], ['historico', 'Histórico']].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setActiveTab(k)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === k ? 'bg-green-500 text-white' : 'text-ink-4 hover:bg-green-10'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {(activeTab === 'evolucao' || activeTab === 'avaliacoes') && (
                  loadingRecords ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (() => {
                    const filteredRecords = records.filter(r =>
                      activeTab === 'avaliacoes' ? r.record_type === 'avaliacao' : (r.record_type ?? 'evolucao') !== 'avaliacao'
                    )
                    return filteredRecords.length === 0 ? (
                      <div className="flex items-center justify-center h-40 text-ink-5 text-sm">
                        {activeTab === 'avaliacoes' ? 'Nenhuma avaliação registrada ainda.' : 'Nenhuma evolução registrada ainda.'}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredRecords.map(note => (
                          <div key={note.id} className="border-l-2 border-green-200 pl-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-green-600">{note.assessment_type ?? 'Sessão'}</span>
                              <span className="text-xs text-ink-5">{formatDate(note.date)}</span>
                            </div>
                            <p className="text-sm text-ink-3 leading-relaxed">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()
                )}

                {activeTab === 'documentos' && (
                  loadingDocuments ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-ink-5 text-sm">
                      Nenhum documento enviado ainda.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                          <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{doc.name}</p>
                            <p className="text-xs text-ink-5">{formatDate(doc.created_at)} · {formatBytes(doc.size)}</p>
                          </div>
                          <button className="text-ink-4 hover:text-green-600 transition-colors" onClick={() => handleDownloadDocument(doc)} title="Baixar">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="text-ink-4 hover:text-red-500 transition-colors" onClick={() => handleDeleteDocument(doc)} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'historico' && (
                  loadingHistory || loadingRecords ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (() => {
                    type TimelineItem = { date: string; key: string; icon: typeof Calendar; label: string; detail: string; color: string }
                    const items: TimelineItem[] = [
                      ...historySessions.map(s => ({
                        date: s.date,
                        key: `session-${s.id}`,
                        icon: Calendar,
                        label: `Sessão (${s.type}) — ${s.status}`,
                        detail: `${s.time?.slice(0, 5) ?? ''} · ${s.duration} min${s.notes ? ` · ${s.notes}` : ''}`,
                        color: 'text-blue-500',
                      })),
                      ...historyTransactions.map(t => ({
                        date: t.date,
                        key: `transaction-${t.id}`,
                        icon: DollarSign,
                        label: `Lançamento financeiro — ${t.status}`,
                        detail: `${formatBRL(t.amount)} · ${t.type}`,
                        color: 'text-green-500',
                      })),
                      ...records.map(r => ({
                        date: r.date,
                        key: `record-${r.id}`,
                        icon: ClipboardList,
                        label: r.record_type === 'avaliacao' ? 'Avaliação' : 'Evolução',
                        detail: r.content,
                        color: 'text-purple-500',
                      })),
                    ].sort((a, b) => b.date.localeCompare(a.date))

                    return items.length === 0 ? (
                      <div className="flex items-center justify-center h-40 text-ink-5 text-sm">
                        Nenhum histórico registrado ainda.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {items.map(item => (
                          <div key={item.key} className="flex gap-3">
                            <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-ink-2">{item.label}</span>
                                <span className="text-xs text-ink-5">{formatDate(item.date)}</span>
                              </div>
                              <p className="text-sm text-ink-3 leading-relaxed truncate">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-5 text-sm">
              Selecione um paciente.
            </div>
          )}
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="record-modal-title">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 id="record-modal-title" className="font-serif text-lg font-semibold">{form.record_type === 'avaliacao' ? 'Nova avaliação' : 'Nova evolução'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-ink-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink-2 block mb-1">Data</label>
                  <input
                    type="date"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-2 block mb-1">Tipo de sessão</label>
                  <select
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                    value={form.session_type}
                    onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}
                  >
                    <option>Presencial</option><option>Online</option><option>Domiciliar</option><option>Escola</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Tipo de registro</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.record_type}
                  onChange={e => setForm(f => ({ ...f, record_type: e.target.value as 'evolucao' | 'avaliacao' }))}
                >
                  <option value="evolucao">Evolução</option>
                  <option value="avaliacao">Avaliação</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">{form.record_type === 'avaliacao' ? 'Avaliação' : 'Evolução'}</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none h-32"
                  placeholder={form.record_type === 'avaliacao' ? 'Descreva a avaliação do paciente...' : 'Descreva a evolução do paciente nesta sessão...'}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button fullWidth onClick={handleSaveRecord} disabled={saving || !form.content}>
                  {saving ? 'Salvando...' : form.record_type === 'avaliacao' ? 'Salvar avaliação' : 'Salvar evolução'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
