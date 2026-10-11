import { useNavigate } from "react-router-dom";
import "./SummaryCards.css";

import {
    Users,
    PhoneCall,
    BadgeCheck,
    GraduationCap,
} from "lucide-react";

import SummaryCard from "./SummaryCard";

const SummaryCards = ({ summary = {} }) => {
    const navigate = useNavigate();

    const cards = [

        {
            title: "Assigned Leads",
            value: summary.assigned_leads ?? 0,
            icon: <Users size={28} />,
            color: "blue",
            onClick: () => navigate("/employee/leads"),
        },

        {
            title: "Today's Follow-ups",
            value: summary.today_followups ?? 0,
            icon: <PhoneCall size={28} />,
            color: "orange",
            onClick: () => navigate("/employee/followups?filter=Due%20Today"),
        },

        {
            title: "Interested Leads",
            value: summary.interested_leads ?? 0,
            icon: <BadgeCheck size={28} />,
            color: "green",
            onClick: () => navigate("/employee/leads?status=INTERESTED"),
        },

        {
            title: "Admissions",
            value: summary.admissions ?? 0,
            icon: <GraduationCap size={28} />,
            color: "purple",
            onClick: () => navigate("/employee/admissions"),
        },

    ];

    return (

        <div className="summary-cards">

            {cards.map((card) => (

                <SummaryCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    icon={card.icon}
                    color={card.color}
                    onClick={card.onClick}
                />

            ))}

        </div>

    );

};

export default SummaryCards;