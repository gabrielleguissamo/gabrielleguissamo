import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-10">
        <Link to="/cadastro" className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline mb-6">
          <ChevronLeft size={16} /> Voltar
        </Link>

        <h1 className="font-serif text-2xl font-bold text-ink mb-1">Política de Privacidade</h1>
        <p className="text-sm text-ink-4 mb-6">Última atualização: 11 de junho de 2026</p>

        <div className="space-y-5 text-sm text-ink-2 leading-relaxed">
          <p>
            O Terapô.pro ("nós") respeita a sua privacidade e está comprometido em proteger os dados pessoais
            tratados em nossa plataforma, em conformidade com a Lei Geral de Proteção de Dados Pessoais
            (Lei nº 13.709/2018 — LGPD).
          </p>

          <section>
            <h2 className="font-semibold text-ink mb-1">1. Quem somos</h2>
            <p>
              O Terapô.pro é uma plataforma de gestão clínica para terapeutas ocupacionais, atuando como
              controladora dos dados cadastrais da conta do profissional e como operadora dos dados de
              pacientes inseridos pelo profissional (controlador dos dados de seus pacientes).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">2. Dados que coletamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dados de cadastro do profissional: nome, e-mail, senha, CRF/TO, estado, cidade, foto e logo.</li>
              <li>Dados de pacientes inseridos por você: nome, data de nascimento, CPF, diagnóstico, responsável, telefone, e-mail, convênio, valores e prontuários.</li>
              <li>Dados de uso: agendamentos, lançamentos financeiros, documentos enviados e relatórios gerados.</li>
              <li>Dados técnicos: endereço IP, tipo de navegador e cookies de sessão para autenticação.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">3. Finalidade do tratamento</h2>
            <p>
              Os dados são utilizados exclusivamente para viabilizar o funcionamento da plataforma:
              agendamento de sessões, controle financeiro, elaboração de prontuários e relatórios clínicos,
              comunicação sobre a conta e melhorias do serviço.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">4. Compartilhamento de dados</h2>
            <p>
              Não vendemos ou compartilhamos seus dados com terceiros para fins de marketing. Os dados podem
              ser processados por provedores de infraestrutura (ex: Supabase, serviços de e-mail e de IA para
              geração de relatórios) estritamente para a operação da plataforma, sob obrigações contratuais
              de confidencialidade e segurança.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">5. Integração com o Google Agenda</h2>
            <p>
              Se você optar por conectar sua conta do Google ao Terapô.pro, solicitamos acesso ao escopo{' '}
              <code>https://www.googleapis.com/auth/calendar.events</code> para criar, atualizar e excluir
              eventos na sua Agenda do Google, exclusivamente para sincronizar as sessões agendadas na
              plataforma com o seu calendário pessoal. Não lemos, armazenamos nem compartilhamos nenhum
              outro dado da sua conta Google além do necessário para essa sincronização, e essas
              informações nunca são usadas para fins de publicidade. O uso de dados do Google pelo
              Terapô.pro está em conformidade com a Política de Dados do Usuário dos Serviços de API do
              Google, incluindo os requisitos de Uso Limitado (Limited Use). Você pode revogar esse acesso
              a qualquer momento em Configurações &gt; Notificações, dentro do app, ou diretamente na sua
              conta Google em{' '}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-green-600 underline">
                myaccount.google.com/permissions
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">6. Armazenamento e segurança</h2>
            <p>
              Os dados são armazenados em servidores com criptografia em trânsito e em repouso, com controle
              de acesso restrito por autenticação e políticas de segurança em nível de linha (RLS), garantindo
              que cada profissional acesse apenas os dados de sua própria conta e pacientes.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">7. Seus direitos</h2>
            <p>Você pode, a qualquer momento, solicitar:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Exportação dos seus dados em formato legível;</li>
              <li>Exclusão da conta e dos dados associados, salvo obrigações legais de retenção;</li>
              <li>Revogação do consentimento, quando aplicável.</li>
            </ul>
            <p className="mt-2">
              Essas solicitações podem ser feitas diretamente em Configurações &gt; Segurança, ou pelo
              e-mail <a href="mailto:contato@terapo.pro" className="text-green-600 underline">contato@terapo.pro</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">8. Retenção dos dados</h2>
            <p>
              Os dados são mantidos enquanto a conta estiver ativa. Ao solicitar a exclusão da conta, os
              dados pessoais são removidos em até 30 dias, exceto quando a manutenção for exigida por
              obrigação legal ou regulatória.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">9. Responsabilidade do profissional</h2>
            <p>
              Como controlador dos dados de seus pacientes, é responsabilidade do profissional obter o
              consentimento adequado dos pacientes (ou responsáveis legais) para o registro de informações
              clínicas na plataforma, conforme exigido pela LGPD e pelo código de ética profissional.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">10. Alterações desta política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos sobre alterações relevantes
              por e-mail ou através da plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">11. Contato</h2>
            <p>
              Em caso de dúvidas sobre o tratamento de dados, contate-nos em{' '}
              <a href="mailto:contato@terapo.pro" className="text-green-600 underline">contato@terapo.pro</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
