/**
 * Portal navigation structure.
 *
 * Non-officer roles keep the original global portal navigation. Officer routes
 * support a second-level department dimension without changing the top-level
 * role or the existing GIS, ministry, or citizen portals.
 */
import type { OfficerDepartment, Role } from "./domain";

export type NavItem = {
  key: string;
  label: string;
  to?: string;
  phase?: string;
};

export type NavGroup = { key: string; label: string; items: NavItem[] };

export type PortalPath =
  | "/officer"
  | "/officer/gis"
  | "/officer/projects"
  | "/officer/cases"
  | "/officer/objections"
  | "/officer/compensation"
  | "/officer/revenue"
  | "/officer/revenue/cases"
  | "/officer/revenue/objections"
  | "/officer/revenue/notifications"
  | "/officer/survey"
  | "/officer/survey/parcels"
  | "/officer/survey/issues"
  | "/officer/treasury"
  | "/officer/treasury/awards"
  | "/officer/treasury/payments"
  | "/officer/rr"
  | "/officer/rr/families"
  | "/officer/possession"
  | "/officer/documents"
  | "/officer/ai"
  | "/officer/reports"
  | "/ministry"
  | "/ministry/projects"
  | "/ministry/analytics"
  | "/ministry/risk"
  | "/ministry/compensation"
  | "/ministry/rr"
  | "/ministry/reports"
  | "/citizen"
  | "/citizen/case"
  | "/citizen/timeline"
  | "/citizen/hearing"
  | "/citizen/documents"
  | "/citizen/objections"
  | "/citizen/verification"
  | "/citizen/compensation"
  | "/citizen/payment-discrepancy"
  | "/citizen/rr"
  | "/citizen/notifications"
  | "/citizen/sms"
  | "/citizen/help";

export const OFFICER_FALLBACK_NAV: NavGroup[] = [
  {
    key: "operations",
    label: "Operations",
    items: [
      { key: "dashboard", label: "Dashboard", to: "/officer" },
      { key: "gis", label: "GIS", to: "/officer/gis" },
    ],
  },
];

export const OFFICER_NAV: Record<OfficerDepartment, NavGroup[]> = {
  project_authority_gis: [
    {
      key: "project_authority",
      label: "Project Authority / Technical & GIS",
      items: [
        { key: "dashboard", label: "Overview", to: "/officer" },
        { key: "gis", label: "GIS & Alignment", to: "/officer/gis" },
      ],
    },
  ],
  survey_land_records: [
    {
      key: "survey_operations",
      label: "Survey & Land Records",
      items: [
        { key: "dashboard", label: "Dashboard", to: "/officer/survey" },
        { key: "parcels", label: "Parcel surveys", to: "/officer/survey/parcels" },
        { key: "issues", label: "Survey & Field Issues", to: "/officer/survey/issues" },
        { key: "gis", label: "GIS Land Map — View", to: "/officer/gis" },
      ],
    },
  ],
  land_acquisition: [
    {
      key: "revenue_operations",
      label: "Land Acquisition Workspace",
      items: [
        { key: "dashboard", label: "Dashboard", to: "/officer/revenue" },
        { key: "cases", label: "Acquisition cases", to: "/officer/revenue/cases" },
        { key: "objections", label: "Objections & Hearings", to: "/officer/revenue/objections" },
        { key: "notifications", label: "Notifications & declaration", to: "/officer/revenue/notifications" },
        { key: "gis", label: "GIS Land Map — View", to: "/officer/gis" },
      ],
    },
  ],
  treasury_finance: [
    {
      key: "treasury_operations",
      label: "Treasury / Finance",
      items: [
        { key: "dashboard", label: "Dashboard", to: "/officer/treasury" },
        { key: "awards", label: "Compensation awards", to: "/officer/treasury/awards" },
        { key: "payments", label: "Payment tracking", to: "/officer/treasury/payments" },
        { key: "gis", label: "GIS Land Map — View", to: "/officer/gis" },
      ],
    },
  ],
  rr: [
    {
      key: "rr_operations",
      label: "Rehabilitation & Resettlement",
      items: [
        { key: "dashboard", label: "Dashboard", to: "/officer/rr" },
        { key: "families", label: "Affected families", to: "/officer/rr/families" },
        { key: "gis", label: "GIS Land Map — View", to: "/officer/gis" },
      ],
    },
  ],
  district_administration: [
    {
      key: "district_operations",
      label: "District Administration / Coordination",
      items: [
        { key: "dashboard", label: "Overview", to: "/officer" },
      ],
    },
  ],
};

export const PORTAL_NAV: Record<Exclude<Role, "officer">, NavGroup[]> = {
  ministry: [
    {
      key: "overview",
      label: "Overview",
      items: [
        { key: "overview", label: "Overview", to: "/ministry" },
        { key: "projects", label: "Projects", to: "/ministry/projects", phase: "Phase 4" },
      ],
    },
    {
      key: "monitoring",
      label: "Monitoring",
      items: [
        { key: "analytics", label: "State / district analytics", to: "/ministry/analytics", phase: "Phase 4" },
        { key: "risk", label: "Risk & delays", to: "/ministry/risk", phase: "Phase 7" },
        { key: "compensation", label: "Compensation", to: "/ministry/compensation", phase: "Phase 6" },
        { key: "rr", label: "R&R", to: "/ministry/rr", phase: "Phase 6" },
      ],
    },
    {
      key: "reporting",
      label: "Reporting",
      items: [{ key: "reports", label: "Reports", to: "/ministry/reports", phase: "Phase 8" }],
    },
  ],
  citizen: [
    {
      key: "mycase",
      label: "My case",
      items: [
        { key: "land", label: "My Land", to: "/citizen" },
        { key: "case", label: "My Case", to: "/citizen/case" },
        { key: "timeline", label: "Timeline", to: "/citizen/timeline" },
        { key: "hearing", label: "Hearing Info", to: "/citizen/hearing" },
      ],
    },
    {
      key: "participation",
      label: "My participation",
      items: [
        { key: "documents", label: "Documents", to: "/citizen/documents" },
        { key: "objections", label: "Objections", to: "/citizen/objections" },
        { key: "verification", label: "Land Verification", to: "/citizen/verification" },
        { key: "compensation", label: "Compensation", to: "/citizen/compensation" },
        { key: "paymentDiscrepancy", label: "Payment Discrepancy", to: "/citizen/payment-discrepancy" },
        { key: "rr", label: "R&R Dashboard", to: "/citizen/rr" },
      ],
    },
    {
      key: "services",
      label: "Communications & Services",
      items: [
        { key: "notifications", label: "Notifications", to: "/citizen/notifications" },
        { key: "sms", label: "SMS Alerts", to: "/citizen/sms" },
      ],
    },
    {
      key: "help",
      label: "Help & Support",
      items: [{ key: "help", label: "Help", to: "/citizen/help" }],
    },
  ],
};
