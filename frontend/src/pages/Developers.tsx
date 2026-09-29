import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const CREW = [
  {
    name: 'Suhani Satav',
    role: 'Frontend & UI Specialist',
    linkedin: 'https://www.linkedin.com/in/suhani-s-s-a2a18b330',
    image: '/suhani.jpg',
  },
  {
    name: 'Shreya Jahagirdar',
    role: 'Backend & Systems Architect',
    linkedin: 'https://www.linkedin.com/in/shreya-jahagirdar-a53b60385',
    image: '/shreya.jpg',
  },
  {
    name: 'Parth Shah',
    role: 'Fullstack Engineer & DevOps',
    linkedin: 'https://www.linkedin.com/in/parth-shah-26154a372',
    image: '/parth.jpg',
  },
];

export default function Developers() {
  return (
    <div className="paper-texture min-h-screen flex flex-col items-center px-4 py-16 bg-[#FAF8F5] text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] relative overflow-hidden">
      
      {/* Background Blobs */}
      <div className="blob absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="blob absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-rose-200/15 rounded-full blur-3xl pointer-events-none" />

      {/* Back Button */}
      <div className="w-full max-w-4xl flex justify-start mb-12 relative z-10">
        <Link to="/" className="px-4 py-2 bg-white/70 hover:bg-white rounded-xl border border-[#E5E1D8] font-bold text-sm text-[#867461] hover:text-[#F59E0B] hover:border-[#F59E0B]/50 transition-all card-lift shadow-sm">
          ← Back to Login
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl text-center relative z-10"
      >
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#18181B] tracking-tight mb-4">
          Meet the Crew
        </h1>
        <div className="flex justify-center items-center gap-3 mb-16">
          <span className="h-0.5 w-12 bg-gradient-to-r from-transparent to-[#F59E0B]"></span>
          <p className="text-sm sm:text-base text-[#F59E0B] font-bold uppercase tracking-widest">
            Built with passion. Shipped with precision.
          </p>
          <span className="h-0.5 w-12 bg-gradient-to-l from-transparent to-[#F59E0B]"></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {CREW.map((member, i) => (
            <motion.div 
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="glass-card bg-white/80 p-8 rounded-2xl border border-[#E5E1D8] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-5 border-4 border-white shadow-lg ring-4 ring-[#F59E0B]/20 relative">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-lg text-[#18181B] mb-1">{member.name}</h3>
              {/* <p className="text-xs text-[#867461] uppercase tracking-wider font-semibold mb-6">{member.role}</p> */}
              
              <a 
                href={member.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-auto flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] rounded-xl font-bold text-sm transition-colors w-full justify-center"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                Connect
              </a>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
