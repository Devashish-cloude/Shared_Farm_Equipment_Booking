import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Phone, Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#164B35] text-white pt-16 pb-12 border-t border-[#235D40]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#B8D96B]">
                <Sprout className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="font-heading font-extrabold text-2xl tracking-tight text-white">
                Shared Farm
              </span>
            </div>
            <p className="text-sm text-[#DCE8E2] max-w-sm leading-relaxed">
              Better farming starts with sharing. Enabling rural farming communities to maximize machinery utilization, eliminate redundant capital debt, and access modern technology at fair hourly rates.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#B8D96B]">
              <ShieldCheck className="w-4 h-4 text-[#B8D96B]" />
              <span>Verified Local Farmers &bull; Protected Security Deposits</span>
            </div>
          </div>

          {/* Col 2: Machinery Categories */}
          <div>
            <h4 className="font-heading font-bold text-sm tracking-wide text-white uppercase mb-4">
              Machinery
            </h4>
            <ul className="space-y-2.5 text-sm text-[#DCE8E2]">
              <li>
                <Link to="/equipment?category=Tractors" className="hover:text-[#B8D96B] transition-colors">
                  Tractors (35-75 HP)
                </Link>
              </li>
              <li>
                <Link to="/equipment?category=Harvesters" className="hover:text-[#B8D96B] transition-colors">
                  Combine Harvesters
                </Link>
              </li>
              <li>
                <Link to="/equipment?category=Rotavators" className="hover:text-[#B8D96B] transition-colors">
                  Rotary Tillers
                </Link>
              </li>
              <li>
                <Link to="/equipment?category=Seed+Drills" className="hover:text-[#B8D96B] transition-colors">
                  Zero-Till Seed Drills
                </Link>
              </li>
              <li>
                <Link to="/equipment?category=Sprayers" className="hover:text-[#B8D96B] transition-colors">
                  Boom &amp; HTP Sprayers
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Platform Navigation */}
          <div>
            <h4 className="font-heading font-bold text-sm tracking-wide text-white uppercase mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-[#DCE8E2]">
              <li>
                <Link to="/equipment" className="hover:text-[#B8D96B] transition-colors">
                  Find Equipment
                </Link>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-[#B8D96B] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link to="/dashboard/equipment/new" className="hover:text-[#B8D96B] transition-colors">
                  List Your Machinery
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#B8D96B] transition-colors">
                  Unified Dashboard
                </Link>
              </li>
              <li>
                <Link to="/dashboard/tracking" className="hover:text-[#B8D96B] transition-colors">
                  Live Equipment Tracking
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Farmer Support */}
          <div>
            <h4 className="font-heading font-bold text-sm tracking-wide text-white uppercase mb-4">
              Help &amp; Support
            </h4>
            <ul className="space-y-3 text-sm text-[#DCE8E2]">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#B8D96B] shrink-0 mt-0.5" />
                <span>Toll-Free Helpline: 1800-200-FARM</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#B8D96B] shrink-0 mt-0.5" />
                <span>support@sharedfarm.demo</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#B8D96B] shrink-0 mt-0.5" />
                <span>Rural Agri Hub, Anand, Gujarat</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94BBA7]">
          <p>
            &copy; {new Date().getFullYear()} Shared Farm Technologies. All rights reserved. Single-account farmer platform.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-[#DCE8E2]">
              Built with <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> for Indian Agriculture
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
