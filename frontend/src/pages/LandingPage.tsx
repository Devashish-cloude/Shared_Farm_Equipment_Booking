import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Tractor,
  TrendingUp,
  Clock,
  Sparkles,
  Users,
  Award,
  ChevronRight,
  FileCheck2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EquipmentCard } from '../components/equipment/EquipmentCard';
import { LocationAutocompleteInput } from '../components/ui/LocationAutocompleteInput';
import { mockStore } from '../services/mockStore';

import { useLanguage } from '../context/LanguageContext';
import { EquipmentCategory } from '../types';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchLocation, setSearchLocation] = useState('Anand, Gujarat');
  const [searchCategory, setSearchCategory] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const featuredEquipment = mockStore.getEquipmentList().slice(0, 4);

  const categories: { key: string; title: EquipmentCategory; icon: string; count: number }[] = [
    { key: 'tractors', title: 'Tractors', icon: '🚜', count: 18 },
    { key: 'harvesters', title: 'Harvesters', icon: '🌾', count: 6 },
    { key: 'rotavators', title: 'Rotavators', icon: '⚙️', count: 14 },
    { key: 'seedDrills', title: 'Seed Drills', icon: '🌱', count: 9 },
    { key: 'sprayers', title: 'Sprayers', icon: '💧', count: 11 },
    { key: 'cultivators', title: 'Cultivators', icon: '🛠️', count: 12 },
    { key: 'threshers', title: 'Threshers', icon: '📦', count: 7 },
    { key: 'ploughs', title: 'Ploughs', icon: '⛏️', count: 8 },
  ];

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation) params.set('location', searchLocation);
    if (searchCategory && searchCategory !== 'All') params.set('category', searchCategory);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    navigate(`/equipment?${params.toString()}`);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EFF2EB] via-[#F7F8F2] to-[#F7F8F2] pt-8 sm:pt-14 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & Search Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#164B35]/10 text-[#164B35] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#347653]" />
                <span>{t('hero.badge')}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#164B35] font-heading tracking-tight leading-[1.1]">
                {t('hero.title')}{' '}
                <span className="text-[#347653] underline decoration-[#B8D96B] decoration-4 underline-offset-8">
                  {t('hero.titleHighlight')}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#526058] max-w-2xl leading-relaxed">
                {t('hero.subtitle')}
              </p>

              {/* Quick Search Card */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E2E7DE] shadow-medium">
                <form onSubmit={handleHeroSearch} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Location input */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#25312A] uppercase tracking-wide">
                        {t('hero.location')}
                      </label>
                      <LocationAutocompleteInput
                        value={searchLocation}
                        onChange={setSearchLocation}
                        placeholder={t('hero.locationPlaceholder')}
                        className="py-2.5"
                      />
                    </div>


                    {/* Category input */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#25312A] uppercase tracking-wide">
                        {t('hero.machineryType')}
                      </label>
                      <select
                        value={searchCategory}
                        onChange={(e) => setSearchCategory(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE] focus:outline-none focus:ring-2 focus:ring-[#164B35] text-[#25312A] font-medium"
                      >
                        <option value="All">{t('hero.allCategories')}</option>
                        <option value="Tractors">{t('cat.tractors')}</option>
                        <option value="Harvesters">{t('cat.harvesters')}</option>
                        <option value="Rotavators">{t('cat.rotavators')}</option>
                        <option value="Seed Drills">{t('cat.seedDrills')}</option>
                        <option value="Sprayers">{t('cat.sprayers')}</option>
                        <option value="Cultivators">{t('cat.cultivators')}</option>
                        <option value="Threshers">{t('cat.threshers')}</option>
                        <option value="Ploughs">{t('cat.ploughs')}</option>
                      </select>
                    </div>

                    {/* Dates */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#25312A] uppercase tracking-wide">
                        {t('hero.startDate')}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE] focus:outline-none focus:ring-2 focus:ring-[#164B35] text-[#25312A] font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#25312A] uppercase tracking-wide">
                        {t('hero.endDate')}
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE] focus:outline-none focus:ring-2 focus:ring-[#164B35] text-[#25312A] font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#526058]">
                      <ShieldCheck className="w-4 h-4 text-[#347653]" />
                      <span>{t('hero.zeroCapital')}</span>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      leftIcon={<Search className="w-4 h-4" />}
                      className="w-full sm:w-auto"
                    >
                      {t('hero.findBtn')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[4/3] lg:aspect-[5/4] bg-[#F0F5F2]">
                <img
                  src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&auto=format&fit=crop&q=70"
                  alt="Modern tractor working in lush agricultural field"
                  fetchPriority="high"
                  decoding="sync"
                  width={640}
                  height={480}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                  <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#B8D96B] text-[#164B35]">
                    {t('hero.activeRental')}
                  </span>
                  <h3 className="font-heading font-bold text-lg">Mahindra 575 DI (47 HP)</h3>
                  <p className="text-xs text-[#DCE8E2]">Rented by Ramesh Patel &bull; Anand, Gujarat</p>
                </div>
              </div>

              {/* Floating verified badge card */}
              <div className="hidden sm:flex absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl border border-[#E2E7DE] shadow-xl items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0F5F2] flex items-center justify-center text-[#164B35]">
                  <CheckCircle2 className="w-6 h-6 text-[#347653]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#25312A]">{t('hero.verifiedFarmers')}</p>
                  <p className="text-[11px] text-[#526058]">{t('hero.verifiedDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-[#347653] uppercase tracking-wider">
              {t('cat.sectionBadge')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#164B35] font-heading mt-1">
              {t('cat.sectionTitle')}
            </h2>
          </div>
          <Link
            to="/equipment"
            className="text-xs font-bold text-[#164B35] hover:text-[#347653] flex items-center gap-1 group"
          >
            <span>{t('cat.viewAll')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              to={`/equipment?category=${encodeURIComponent(cat.title)}`}
              className="bg-white p-5 rounded-2xl border border-[#E2E7DE] hover:border-[#164B35] hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <h3 className="font-heading font-bold text-sm text-[#25312A] group-hover:text-[#164B35] transition-colors">
                  {t(`cat.${cat.key}`)}
                </h3>
                <p className="text-[11px] text-[#526058] mt-1">{t(`cat.${cat.key}Desc`)}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E7DE]/60 flex items-center justify-between text-[11px] text-[#7C8C83]">
                <span>{cat.count} Available</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#347653] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FEATURED EQUIPMENT SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-[#347653] uppercase tracking-wider">
              {t('feat.badge')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#164B35] font-heading mt-1">
              {t('feat.title')}
            </h2>
          </div>
          <Link
            to="/equipment"
            className="text-xs font-bold text-[#164B35] hover:text-[#347653] flex items-center gap-1 group"
          >
            <span>{t('cat.viewAll')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredEquipment.map((eq) => (
            <EquipmentCard key={eq.id} equipment={eq} layout="grid" />
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#F0F5F2] py-16 px-4 sm:px-6 lg:px-8 border-y border-[#E2E7DE]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-[#347653] uppercase tracking-wider">
              {t('how.badge')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#164B35] font-heading mt-1">
              {t('how.title')}
            </h2>
            <p className="text-sm text-[#526058] mt-2">
              {t('how.step1Desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: t('how.step1Title'),
                desc: t('how.step1Desc'),
              },
              {
                step: '02',
                title: t('how.step2Title'),
                desc: t('how.step2Desc'),
              },
              {
                step: '03',
                title: t('how.step3Title'),
                desc: t('how.step3Desc'),
              },
              {
                step: '04',
                title: t('how.step4Title'),
                desc: t('how.step4Desc'),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white p-6 rounded-2xl border border-[#CBD5C7] shadow-sm relative group hover:border-[#164B35] transition-colors"
              >
                <span className="text-2xl font-extrabold text-[#B8D96B] font-heading mb-2 block">
                  {item.step}
                </span>
                <h3 className="font-heading font-bold text-base text-[#25312A] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-[#526058] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TWO PROMINENT PATHS: NEED EQUIPMENT VS. HAVE EQUIPMENT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Path A: Need Equipment */}
          <div className="bg-[#164B35] text-white p-8 sm:p-10 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-6">
            <div className="space-y-3 relative z-10">
              <span className="inline-block text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#B8D96B] text-[#164B35]">
                Need Equipment?
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-heading">
                Access High-End Machinery Without Buying Debt
              </h3>
              <p className="text-sm text-[#DCE8E2] leading-relaxed">
                Why take heavy loans for a machine you use only 15 days a season? Rent John Deere, Mahindra, or specialized implements right when you need them.
              </p>
            </div>
            <div className="relative z-10 pt-2">
              <Link to="/equipment">
                <Button variant="lime" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Nearby Machinery
                </Button>
              </Link>
            </div>
          </div>

          {/* Path B: Have Equipment */}
          <div className="bg-white border-2 border-[#164B35] p-8 sm:p-10 rounded-3xl flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-3">
              <span className="inline-block text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#F0F5F2] text-[#164B35]">
                Have Equipment to Share?
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#164B35]">
                Turn Idle Machinery Into Extra Farm Income
              </h3>
              <p className="text-sm text-[#526058] leading-relaxed">
                Tractors sitting in sheds cost depreciation. Share them with verified neighbors, earn steady hourly returns, and maintain full control over your dates.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/dashboard/equipment/new">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  List Your Equipment Today
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BENEFITS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#347653] uppercase tracking-wider">
            Why Shared Farm
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#164B35] font-heading mt-1">
            Empowering Farmers Through Shared Resources
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: TrendingUp,
              title: 'Lower Capital Costs',
              desc: 'Cut agricultural machinery expenditure by up to 60% compared to solo machine financing.',
            },
            {
              icon: Tractor,
              title: 'Higher Asset Utilization',
              desc: 'Keep expensive implements actively productive rather than depreciating in sheds.',
            },
            {
              icon: Clock,
              title: 'Timely Crop Operations',
              desc: 'Access seed drills and sprayers on short notice right at critical weather and growth windows.',
            },
            {
              icon: FileCheck2,
              title: 'Transparent Pricing',
              desc: 'Standardized hourly and daily rates with no hidden middleman markups.',
            },
          ].map((ben, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#F0F5F2] flex items-center justify-center text-[#164B35]">
                <ben.icon className="w-6 h-6 text-[#347653]" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#25312A]">{ben.title}</h3>
              <p className="text-xs text-[#526058] leading-relaxed">{ben.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. TRUST AND SAFETY SECTION */}
      <section className="bg-[#164B35] text-white py-14 px-4 sm:px-6 lg:px-8 rounded-3xl max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-1 space-y-3">
            <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-white/10 text-[#B8D96B]">
              Safety First
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold font-heading">
              Built on Mutual Trust &amp; Protection
            </h3>
            <p className="text-xs text-[#DCE8E2] leading-relaxed">
              Every booking is backed by transparent verification, clear condition handovers, and security deposit escrow.
            </p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-xs space-y-2 border border-white/10">
              <ShieldCheck className="w-6 h-6 text-[#B8D96B]" />
              <h4 className="font-heading font-bold text-sm">Verified Farmer Profiles</h4>
              <p className="text-xs text-[#DCE8E2]">
                Members are verified using Aadhaar and local village reference checks to prevent misuse.
              </p>
            </div>

            <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-xs space-y-2 border border-white/10">
              <Award className="w-6 h-6 text-[#B8D96B]" />
              <h4 className="font-heading font-bold text-sm">Escrow Security Deposits</h4>
              <p className="text-xs text-[#DCE8E2]">
                Deposits are held safely and refunded immediately upon successful inspection and equipment return.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ILLUSTRATIVE TESTIMONIALS (Clearly labelled demo content) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold mb-2">
            <span>Illustrative Farmer Feedback (Demo Content)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#164B35] font-heading">
            Stories From The Ground
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote: 'Instead of spending ₹9 Lakh on a harvester for 8 days of paddy cutting, I booked a Preet 987 on Shared Farm. Saved me from a bank loan!',
              author: 'Balwinder Dhillon',
              location: 'Ludhiana, Punjab',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
              role: 'Renting Farmer',
            },
            {
              quote: 'My 55 HP John Deere sat idle between July and September. Sharing it with neighboring cotton farmers brought ₹34,000 extra income.',
              author: 'Gurpreet Singh',
              location: 'Samarkha, Anand',
              avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
              role: 'Machinery Owner & Farmer',
            },
            {
              quote: 'The boom sprayer was in top mechanical condition. Booking with an experienced tractor driver made bio-spray application 3x faster.',
              author: 'Sunita Sharma',
              location: 'Karamsad, Gujarat',
              avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100',
              role: 'Vegetable Grower',
            },
          ].map((t, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-[#E2E7DE] shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#526058] italic leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-[#E2E7DE]">
                <img src={t.avatar} alt={t.author} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-[#25312A]">{t.author}</h4>
                  <p className="text-[11px] text-[#7C8C83]">{t.location} &bull; {t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. BOTTOM CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center bg-[#F0F5F2] py-14 rounded-3xl border border-[#CBD5C7]">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#164B35] font-heading">
          Ready to revolutionize your farm operations?
        </h2>
        <p className="text-sm text-[#526058] max-w-lg mx-auto mt-2 mb-6">
          Join thousands of progressive farmers sharing equipment, cutting expenses, and growing together.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/register">
            <Button variant="primary" size="lg">
              Create Free Farmer Account
            </Button>
          </Link>
          <Link to="/equipment">
            <Button variant="outline" size="lg">
              Explore Available Machinery
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
