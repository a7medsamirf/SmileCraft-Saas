"use client";
import { motion } from "framer-motion";
import {
  Users,
  CalendarDays,
  BarChart3,
  CircleDollarSign,
  Image,
  UserCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "ملفات المرضى الذكية",
    desc: "سجلات طبية شاملة لكل مريض، تشمل التاريخ العلاجي، الأشعة، الوصفات، والملاحظات — كل شيء في متناول يدك.",
    highlighted: true,
  },
  {
    icon: CalendarDays,
    title: "جدولة المواعيد",
    desc: "نظام حجز متطور مع تذكيرات تلقائية للمرضى عبر الرسائل النصية والبريد الإلكتروني، وتقليل الغيابات.",
  },
  {
    icon: BarChart3,
    title: "تقارير وتحليلات",
    desc: "لوحة تحكم تفاعلية توضح الإيرادات، نمو المرضى، وأنواع العلاجات الأكثر طلباً بشكل بياني واضح.",
  },
  {
    icon: CircleDollarSign,
    title: "الفواتير والمدفوعات",
    desc: "إنشاء فواتير احترافية، تتبع المدفوعات، وإرسالها مباشرة للمرضى. دعم كامل للدفع بالتقسيط.",
  },
  {
    icon: Image,
    title: "إدارة الأشعة والصور",
    desc: "رفع وحفظ صور الأشعة والتصوير الداخلي بجودة عالية، مع ربطها تلقائياً بملف المريض وجلسة العلاج.",
  },
  {
    icon: UserCheck,
    title: "دعم متعدد الأطباء",
    desc: "إدارة عيادة كاملة بأكثر من طبيب، مع صلاحيات منفصلة لكل مستخدم وجدول مواعيد خاص بكل دكتور.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-[100px] px-[5vw]" dir="rtl">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-[12px] font-extrabold text-[#2563EB] tracking-[0.12em] uppercase mb-3.5">
            <span className="w-6 h-0.5 bg-[#2563EB] rounded" />
            المميزات
          </div>
          <h2 className="fluid-title font-black text-white tracking-[-0.5px]">
            كل ما تحتاجه <span className="text-[#6B849E] font-semibold">في  نظام واحد</span>
          </h2>
          <p className="text-[15.5px] text-[#6B849E] font-medium leading-[1.8] mt-3.5 max-w-[560px]">
            من إدارة الملفات الطبية والمرضى إلى الفواتير والتقارير — SmileCraft يغطي كل جانب من جوانب عيادتك.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-[60px]"
        >
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                className="landing-feature-card relative rounded-[20px] p-7 overflow-hidden cursor-default"
                style={{
                  background: feat.highlighted
                    ? "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02))"
                    : "#0D1B2E",
                  border: feat.highlighted
                    ? "1px solid rgba(37,99,235,0.2)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Top Glow Line */}
                <div
                  className="feature-topline absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2563EB] to-transparent"
                  style={{ opacity: feat.highlighted ? 1 : 0, transition: "opacity 0.3s" }}
                />

                <div className="w-12 h-12 rounded-[13px] bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.15)] flex items-center justify-center text-[#2563EB] mb-5">
                  <Icon size={22} strokeWidth={1.8} />
                </div>
                <h3 className="text-[16px] font-extrabold text-white mb-2.5">{feat.title}</h3>
                <p className="text-[13.5px] text-[#6B849E] font-medium leading-[1.75]">{feat.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
