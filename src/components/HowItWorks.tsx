import Icon from '@/components/ui/icon';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      icon: 'MessageSquare',
      title: 'Оставьте заявку',
      description: 'Свяжитесь с нами любым удобным способом или заполните форму на сайте'
    },
    {
      number: '02',
      icon: 'Users',
      title: 'Обсуждение',
      description: 'Мы изучим ваши требования и предложим оптимальное решение'
    },
    {
      number: '03',
      icon: 'Code',
      title: 'Разработка',
      description: 'Наша команда воплотит проект в жизнь с учётом всех пожеланий'
    },
    {
      number: '04',
      icon: 'Rocket',
      title: 'Запуск',
      description: 'Тестируем, запускаем сайт и обеспечиваем поддержку'
    }
  ];

  return (
    <section className="py-24 px-[50px] bg-white dark:bg-gray-800 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gradient-start/20 to-transparent" />
      
      <div className="max-w-[1500px] mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-[clamp(40px,8vw,80px)] font-black bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end bg-clip-text text-transparent">
            Как мы работаем
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Простой процесс создания вашего идеального сайта за 4 шага
          </p>
        </div>

        <div className="relative">
          {/* Линия соединения */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end transform -translate-y-1/2 opacity-20" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div
                key={index}
                className="group relative"
              >
                {/* Карточка */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border-2 border-gray-100 dark:border-gray-700 hover:border-gradient-start/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden">
                  {/* Декоративный фон */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gradient-start/5 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                  
                  {/* Номер шага */}
                  <div className="absolute top-4 right-4 text-6xl font-black text-gray-100 dark:text-gray-700 group-hover:text-gradient-start/10 transition-colors">
                    {step.number}
                  </div>

                  {/* Иконка */}
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gradient-start to-gradient-mid flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                      <Icon name={step.icon as any} size={28} className="text-white" />
                    </div>
                    {/* Пульсирующее кольцо */}
                    <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-r from-gradient-start to-gradient-mid opacity-0 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500" />
                  </div>

                  {/* Заголовок */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 relative z-10">
                    {step.title}
                  </h3>

                  {/* Описание */}
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed relative z-10">
                    {step.description}
                  </p>

                  {/* Стрелка для десктопа */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow-lg flex items-center justify-center border-2 border-gradient-start/20 group-hover:scale-110 group-hover:border-gradient-start transition-all">
                        <Icon name="ArrowRight" size={16} className="text-gradient-start" />
                      </div>
                    </div>
                  )}

                  {/* Стрелка для мобилки */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center mt-6 -mb-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gradient-start to-gradient-mid shadow-lg flex items-center justify-center animate-bounce">
                        <Icon name="ArrowDown" size={16} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA кнопка */}
        <div className="text-center mt-16">
          <a
            href="#contacts"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-gradient-start to-gradient-mid text-white px-10 py-5 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
          >
            <span>Начать проект</span>
            <Icon name="ArrowRight" size={20} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;