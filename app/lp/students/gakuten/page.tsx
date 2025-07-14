'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import AOS from 'aos';
import 'aos/dist/aos.css';

/* ----------------------------------------------------------------
   Data for each section (edit text / images as needed)
---------------------------------------------------------------- */
const troubles = [
  '自分に合った企業がわからない',
  'インターン経験をうまくアピールできない',
  '早期選考の情報が手に入らない',
  '内定後のミスマッチが不安',
];

const steps = [
  { num: 1, title: '無料登録', text: '30秒で基本情報を入力' },
  { num: 2, title: 'プロフィール作成', text: 'インターン・課外活動を職務経歴書化' },
  { num: 3, title: 'キャリア面談', text: '専属アドバイザーが目標をヒアリング' },
  { num: 4, title: '企業紹介', text: 'AI＋人が最適な求人を提案' },
  { num: 5, title: '内定＆フォロー', text: '内定後も1年間サポート' },
];

const features = [
  { icon: '/icons/one-stop.svg', title: '手厚いサポート', text: '面談から選考対策、内定後フォローまで。' },
  { icon: '/icons/database.svg', title: '非公開求人多数', text: 'スタートアップから大手まで500社超。' },
  { icon: '/icons/team.svg', title: 'AIマッチング', text: 'データとプロがあなたの強みを分析。' },
];

const services = [
  { img: '/images/service1.jpg', title: 'インターン紹介' },
  { img: '/images/service2.jpg', title: '面接対策' },
  { img: '/images/service3.jpg', title: 'ES添削' },
  { img: '/images/service4.jpg', title: 'キャリアイベント' },
];

const faqs = [
  { q: '利用料金はかかりますか？', a: '完全無料でご利用いただけます。' },
  { q: 'まだ方向性が決まっていなくても登録できますか？', a: 'はい、キャリア相談だけでも歓迎です。' },
  { q: '地方在住でも参加できますか？', a: 'オンライン面談で全国対応しております。' },
];

/* ----------------------------------------------------------------
   Page component
---------------------------------------------------------------- */
export default function RecruitSupportPage() {
  // 初期化：AOS
  useEffect(() => {
    AOS.init({ once: true, duration: 800, easing: 'ease-out-cubic' });
  }, []);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section
        className="relative overflow-hidden flex items-center justify-center h-[90vh] bg-center bg-cover"
        style={{ backgroundImage: "url('/images/hero-recruit-support.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-700/70 via-red-900/60 to-black/80 mix-blend-multiply"></div>
        <div className="text-center text-white px-5">
          <h1
            className="text-4xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-red-400 via-pink-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg"
            data-aos="fade-up"
          >
            長期インターン経験を<br className="md:hidden" />
            キャリアの武器に
          </h1>
          <p
            className="max-w-xl mx-auto mb-8 text-sm md:text-base leading-relaxed"
            data-aos="fade-up"
            data-aos-delay="150"
          >
            インターン・課外活動を職務経歴書として可視化し、AIとキャリアアドバイザーがあなたに最適な企業を紹介します。
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-red-600 font-semibold px-8 py-3 rounded-full shadow hover:bg-gray-100 transition"
            data-aos="zoom-in"
            data-aos-delay="300"
          >
            30秒で無料登録
          </Link>
        </div>
      </section>

      {/* ---------- TROUBLES ---------- */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-5">
          <h2 className="section-title" data-aos="fade-up">
            こんなお悩みありませんか？
          </h2>

          <Swiper
            slidesPerView={1.2}
            spaceBetween={20}
            loop
            breakpoints={{
              768: { slidesPerView: 2.2 },
              1024: { slidesPerView: 3.5 },
            }}
            className="mt-10"
          >
            {troubles.map((t, i) => (
              <SwiperSlide key={i}>
                <div
                  className="p-6 bg-white/20 backdrop-blur-lg rounded-2xl border border-white/30 shadow-xl h-full flex items-center"
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                >
                  <p className="font-medium">{t}</p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ---------- 5 STEPS ---------- */}
      <section className="py-20">
        <div className="container mx-auto px-5">
          <h2 className="section-title" data-aos="fade-up">
            5 STEPで内定まで伴走
          </h2>

          <div className="grid gap-8 mt-12 md:grid-cols-5">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className="text-center"
                data-aos="fade-up"
                data-aos-delay={i * 100}
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-600 text-white font-bold text-xl">
                  {s.num}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-5">
          <h2 className="section-title" data-aos="fade-up">
            選ばれる3つの理由
          </h2>

          <div className="grid gap-10 mt-12 md:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg"
                data-aos="fade-up"
                data-aos-delay={i * 150}
              >
                <Image
                  src={f.icon}
                  alt={f.title}
                  width={64}
                  height={64}
                  className="mx-auto mb-4"
                />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- SERVICES ---------- */}
      <section className="py-20">
        <div className="container mx-auto px-5">
          <h2 className="section-title" data-aos="fade-up">
            提供サービス
          </h2>

          <Swiper
            slidesPerView={1.2}
            spaceBetween={24}
            loop
            breakpoints={{
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="mt-12"
          >
            {services.map((s, i) => (
              <SwiperSlide key={s.title}>
                <div
                  className="overflow-hidden rounded-lg shadow-lg"
                  data-aos="fade-up"
                  data-aos-delay={i * 150}
                >
                  <Image
                    src={s.img}
                    alt={s.title}
                    width={600}
                    height={400}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold">{s.title}</h3>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-5">
          <h2 className="section-title" data-aos="fade-up">
            よくあるご質問
          </h2>

          <div className="mt-10 space-y-4">
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className="bg-white rounded-lg shadow-sm p-4"
                data-aos="fade-up"
                data-aos-delay={i * 100}
              >
                <summary className="cursor-pointer font-medium">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm text-gray-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative py-24 bg-gradient-to-r from-red-600 via-pink-600 to-yellow-500 text-white text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          まずは無料会員登録から
        </h2>
        <Link
          href="/signup"
          className="inline-block bg-white/90 text-red-600 font-semibold px-10 py-4 rounded-full shadow-xl backdrop-blur-lg hover:bg-white transition"
        >
          30秒で無料登録
        </Link>
      </section>
    </>
  );
}