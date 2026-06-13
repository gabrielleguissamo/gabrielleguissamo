import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function TermosUso() {
  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-10">
        <Link to="/cadastro" className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline mb-6">
          <ChevronLeft size={16} /> Voltar
        </Link>

        <h1 className="font-serif text-2xl font-bold text-ink mb-1">Termos de Uso</h1>
        <p className="text-sm text-ink-4 mb-6">Última atualização: 11 de junho de 2026</p>

        <div className="space-y-5 text-sm text-ink-2 leading-relaxed">
          <p>
            Estes Termos de Uso regulam o acesso e a utilização da plataforma Terapô.pro. Ao criar uma
            conta, você concorda integralmente com estes termos.
          </p>

          <section>
            <h2 className="font-semibold text-ink mb-1">1. Descrição do serviço</h2>
            <p>
              O Terapô.pro é uma plataforma de gestão clínica voltada a terapeutas ocupacionais, oferecendo
              funcionalidades de agenda, cadastro de pacientes, prontuários, controle financeiro e geração
              de relatórios clínicos com auxílio de inteligência artificial.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">2. Cadastro e conta</h2>
            <p>
              Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas
              as atividades realizadas em sua conta. As informações fornecidas no cadastro devem ser
              verdadeiras, completas e atualizadas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">3. Uso adequado</h2>
            <p>
              A plataforma deve ser utilizada exclusivamente para fins profissionais lícitos relacionados à
              prática da terapia ocupacional. É proibido utilizar o serviço para armazenar dados de pessoas
              sem o devido consentimento, praticar atividades ilegais ou violar direitos de terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">4. Relatórios gerados por IA</h2>
            <p>
              Os relatórios clínicos gerados com auxílio de inteligência artificial são sugestões de
              redação baseadas nas informações fornecidas pelo profissional. A revisão, validação e
              responsabilidade final pelo conteúdo clínico são exclusivamente do profissional que assina
              o documento.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">5. Planos e cobrança</h2>
            <p>
              O acesso à plataforma pode estar sujeito a planos pagos com cobrança recorrente. O
              cancelamento pode ser solicitado a qualquer momento em Configurações &gt; Plano, sem
              multas, sendo o acesso mantido até o fim do período já pago.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">6. Proteção de dados</h2>
            <p>
              O tratamento de dados pessoais é realizado conforme descrito em nossa{' '}
              <Link to="/privacidade" className="text-green-600 underline">Política de Privacidade</Link>,
              em conformidade com a LGPD.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">7. Disponibilidade e suporte</h2>
            <p>
              Buscamos manter a plataforma disponível continuamente, mas não garantimos operação
              ininterrupta. Manutenções programadas serão comunicadas com antecedência sempre que possível.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">8. Encerramento de conta</h2>
            <p>
              Você pode encerrar sua conta a qualquer momento em Configurações &gt; Segurança. Reservamo-nos
              o direito de suspender ou encerrar contas que violem estes termos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">9. Alterações destes termos</h2>
            <p>
              Estes termos podem ser atualizados periodicamente. O uso contínuo da plataforma após
              alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-ink mb-1">10. Contato</h2>
            <p>
              Dúvidas sobre estes termos podem ser enviadas para{' '}
              <a href="mailto:contato@terapo.pro" className="text-green-600 underline">contato@terapo.pro</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
