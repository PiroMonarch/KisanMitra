/**
 * Scheme Knowledge Base - Seed Data
 * 
 * Official, verified information about agricultural schemes.
 * Normalized Schema for RAG consumption.
 * 
 * Source: Government of India official documents.
 * Last verified: February 2026
 */

export const SCHEME_KNOWLEDGE = {
        KCC: {
                scheme_id: "KCC",
                name: {
                        en: "Kisan Credit Card",
                        hi: "किसान क्रेडिट कार्ड"
                },
                description: {
                        simple: {
                                en: "Kisan Credit Card helps farmers get timely credit for crops and farming needs.",
                                hi: "किसान क्रेडिट कार्ड किसानों को खेती के लिए समय पर ऋण प्रदान करता है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "You are eligible because you are an owner farmer with agricultural land.",
                                hi: "आप पात्र हैं क्योंकि आप कृषि भूमि के मालिक किसान हैं।"
                        },
                        criteria: [
                                "Farmer must be an Indian citizen",
                                "Must engage in agriculture/allied activities",
                                "Valid landholding required (owner/tenant)"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Land Records (Khasra/Khatauni)", required: true },
                                { name: "Bank Passbook", required: true },
                                { name: "Passport size photos", required: true }
                        ],
                        tenant: [
                                { name: "Aadhaar Card", required: true },
                                { name: "No Objection Certificate (NOC) from Landowner", required: true },
                                { name: "Affidavit of Tenancy", required: true }
                        ]
                },
                benefits: {
                        primary: {
                                en: "Low interest crop loans for seeds, fertilizers, and farming expenses.",
                                hi: "बीज, खाद और खेती के खर्चों के लिए कम ब्याज पर ऋण।"
                        },
                        amounts: {
                                en: "Up to ₹3,00,000 collateral-free loan",
                                hi: "₹3,00,000 तक का संपार्श्विक-मुक्त ऋण"
                        },
                        interest: {
                                en: "4% effective interest rate (with timely repayment)",
                                hi: "4% प्रभावी ब्याज दर (समय पर पुनर्भुगतान के साथ)"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Visit your local bank branch that services your area.",
                                        hi: "अपने क्षेत्र की सेवा करने वाले स्थानीय बैंक शाखा पर जाएं।"
                                },
                                {
                                        en: "Submit land records and Aadhaar card.",
                                        hi: "भूमि रिकॉर्ड और आधार कार्ड जमा करें।"
                                }
                        ]
                },
                helpline: "1800-425-3800"
        },

        PMKISAN: {
                scheme_id: "PMKISAN",
                name: {
                        en: "Pradhan Mantri Kisan Samman Nidhi",
                        hi: "प्रधानमंत्री किसान सम्मान निधि"
                },
                description: {
                        simple: {
                                en: "PM-KISAN provides income support of ₹6,000 per year to farmer families.",
                                hi: "पीएम-किसान किसान परिवारों को प्रति वर्ष ₹6,000 की आय सहायता प्रदान करता है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "You are eligible if you are a landholding farmer family.",
                                hi: "आप पात्र हैं यदि आप एक भूमिधारक किसान परिवार हैं।"
                        },
                        criteria: [
                                "Cultivable landholding in own name",
                                "Not an institutional land holder",
                                "Not a high-income status holder"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Bank Account linked to Aadhaar", required: true },
                                { name: "Land Records", required: true }
                        ],
                        tenant: [] // Tenants generally not eligible unless updated rules
                },
                benefits: {
                        primary: {
                                en: "Direct income support for agricultural expenses.",
                                hi: "कृषि खर्चों के लिए प्रत्यक्ष आय सहायता।"
                        },
                        amounts: {
                                en: "₹6,000 per year in 3 installments.",
                                hi: "3 किश्तों में प्रति वर्ष ₹6,000।"
                        },
                        interest: {
                                en: "N/A",
                                hi: "लागू नहीं"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Visit pmkisan.gov.in and click New Registration.",
                                        hi: "pmkisan.gov.in पर जाएं और नया पंजीकरण क्लिक करें।"
                                }
                        ]
                },
                helpline: "155261"
        },

        PMFBY: {
                scheme_id: "PMFBY",
                name: {
                        en: "Pradhan Mantri Fasal Bima Yojana",
                        hi: "प्रधानमंत्री फसल बीमा योजना"
                },
                description: {
                        simple: {
                                en: "PMFBY provides comprehensive crop insurance against natural calamities.",
                                hi: "पीएमएफबीवाई प्राकृतिक आपदाओं के खिलाफ व्यापक फसल बीमा प्रदान करता है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "Eligible for all farmers growing notified crops in notified areas.",
                                hi: "अधिसूचित क्षेत्रों में अधिसूचित फसलें उगाने वाले सभी किसानों के लिए पात्र।"
                        },
                        criteria: [
                                "Growing notified crops",
                                "Loanee farmers (Mandatory)",
                                "Non-loanee farmers (Voluntary)"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Land Records", required: true },
                                { name: "Sowing Certificate", required: true },
                                { name: "Bank Passbook", required: true }
                        ],
                        tenant: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Tenancy Agreement / Sharecropper Certificate", required: true },
                                { name: "Sowing Certificate", required: true }
                        ]
                },
                benefits: {
                        primary: {
                                en: "Insurance coverage for crop loss due to natural risks.",
                                hi: "प्राकृतिक जोखिमों के कारण फसल हानि के लिए बीमा कवरेज।"
                        },
                        amounts: {
                                en: "Full Sum Insured claimed against loss.",
                                hi: "नुकसान के खिलाफ दावा की गई पूर्ण बीमित राशि।"
                        },
                        interest: {
                                en: "Premium: 1.5% (Rabi), 2% (Kharif), 5% (Commercial)",
                                hi: "प्रीमियम: 1.5% (रबी), 2% (खरीफ), 5% (वाणिज्यिक)"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Visit nearest Bank or CSC.",
                                        hi: "निकटतम बैंक या सीएससी पर जाएं।"
                                },
                                {
                                        en: "Apply before sowing cutoff date.",
                                        hi: "बुवाई की अंतिम तिथि से पहले आवेदन करें।"
                                }
                        ]
                },
                helpline: "1800-180-1551"
        },

        SHC: {
                scheme_id: "SHC",
                name: {
                        en: "Soil Health Card Scheme",
                        hi: "मृदा स्वास्थ्य कार्ड योजना"
                },
                description: {
                        simple: {
                                en: "Soil Health Card provides soil testing and fertilizer recommendations.",
                                hi: "मृदा स्वास्थ्य कार्ड मिट्टी परीक्षण और उर्वरक सिफारिशें प्रदान करता है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "Eligible for all farmers with agricultural land.",
                                hi: "कृषि भूमि वाले सभी किसानों के लिए पात्र।"
                        },
                        criteria: [
                                "Land holding required",
                                "Available to tenant farmers with permission"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Land Ownership Proof", required: true }
                        ],
                        tenant: []
                },
                benefits: {
                        primary: {
                                en: "Soil nutrient status report and fertilizer advice.",
                                hi: "मिट्टी पोषक तत्व स्थिति रिपोर्ट और उर्वरक सलाह।"
                        },
                        amounts: {
                                en: "Free of cost soil testing.",
                                hi: "निशुल्क मिट्टी परीक्षण।"
                        },
                        interest: {
                                en: "N/A",
                                hi: "लागू नहीं"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Contact local Agriculture Department.",
                                        hi: "स्थानीय कृषि विभाग से संपर्क करें।"
                                }
                        ]
                },
                helpline: "1800-180-1551"
        },

        SMAM: {
                scheme_id: "SMAM",
                name: {
                        en: "Sub-Mission on Agricultural Mechanization",
                        hi: "कृषि मशीनीकरण उप-मिशन"
                },
                description: {
                        simple: {
                                en: "SMAM provides subsidy for purchasing modern farm machinery.",
                                hi: "SMAM आधुनिक कृषि मशीनरी खरीदने के लिए सब्सिडी प्रदान करता है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "Farmers wishing to mechanize farm operations.",
                                hi: "कृषि कार्यों का मशीनीकरण करने के इच्छुक किसान।"
                        },
                        criteria: [
                                "Valid land records",
                                "Small/Marginal/SC/ST prioritization"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Land Records", required: true },
                                { name: "Bank Passbook", required: true },
                                { name: "Quotation from Dealer", required: true }
                        ],
                        tenant: []
                },
                benefits: {
                        primary: {
                                en: "Financial subsidy on farm buckets.",
                                hi: "कृषि उपकरणों पर वित्तीय सब्सिडी।"
                        },
                        amounts: {
                                en: "40% to 50% Subsidy on equipment cost.",
                                hi: "उपकरण लागत पर 40% से 50% सब्सिडी।"
                        },
                        interest: {
                                en: "N/A",
                                hi: "लागू नहीं"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Apply online at agrimachinery.nic.in.",
                                        hi: "agrimachinery.nic.in पर ऑनलाइन आवेदन करें।"
                                }
                        ]
                },
                helpline: "District Agriculture Officer"
        },
                NABARD_SHG: {
                scheme_id: "NABARD_SHG",
                name: {
                        en: "NABARD SHG–Bank Linkage Programme",
                        hi: "नाबार्ड स्वयं सहायता समूह बैंक लिंकेज कार्यक्रम"
                },
                description: {
                        simple: {
                                en: "This scheme provides small loans to farmers through Self Help Groups without land collateral.",
                                hi: "यह योजना स्वयं सहायता समूहों के माध्यम से किसानों को बिना भूमि गिरवी के ऋण प्रदान करती है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "You are eligible because SHG members can access group-based credit.",
                                hi: "आप पात्र हैं क्योंकि स्वयं सहायता समूह के सदस्य समूह ऋण प्राप्त कर सकते हैं।"
                        },
                        criteria: [
                                "Member of a registered Self Help Group",
                                "Group should have active bank linkage"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "SHG Membership Proof", required: true },
                                { name: "Bank Account Details", required: true }
                        ],
                        tenant: []
                },
                benefits: {
                        primary: {
                                en: "Collateral-free group loans with flexible repayment.",
                                hi: "लचीले पुनर्भुगतान के साथ बिना गिरवी समूह ऋण।"
                        },
                        amounts: {
                                en: "Loan amount depends on SHG grading.",
                                hi: "ऋण राशि एसएचजी ग्रेडिंग पर निर्भर करती है।"
                        },
                        interest: {
                                en: "Bank-determined interest rates.",
                                hi: "बैंक द्वारा निर्धारित ब्याज दरें।"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Apply through SHG bank branch.",
                                        hi: "एसएचजी से जुड़ी बैंक शाखा के माध्यम से आवेदन करें।"
                                }
                        ]
                },
                helpline: "NABARD District Office"
        },

        MUDRA_AGRI: {
                scheme_id: "MUDRA_AGRI",
                name: {
                        en: "PM MUDRA Loan (Agri & Allied Activities)",
                        hi: "प्रधानमंत्री मुद्रा ऋण (कृषि एवं संबद्ध गतिविधियाँ)"
                },
                description: {
                        simple: {
                                en: "MUDRA loans support small agri businesses like trading, processing, and dairy.",
                                hi: "मुद्रा ऋण छोटे कृषि व्यवसायों जैसे व्यापार, प्रसंस्करण और डेयरी को सहायता देता है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "Eligible if you run or plan an agri-related business.",
                                hi: "यदि आप कृषि से संबंधित व्यवसाय चलाते हैं या शुरू करना चाहते हैं तो आप पात्र हैं।"
                        },
                        criteria: [
                                "Agri or allied business activity",
                                "No prior loan default"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Business Details", required: true },
                                { name: "Bank Passbook", required: true }
                        ],
                        tenant: []
                },
                benefits: {
                        primary: {
                                en: "Collateral-free business loans for agri activities.",
                                hi: "कृषि गतिविधियों के लिए बिना गिरवी व्यवसाय ऋण।"
                        },
                        amounts: {
                                en: "Up to ₹10 lakh under Shishu/Kishore/Tarun.",
                                hi: "शिशु/किशोर/तरुण के तहत ₹10 लाख तक।"
                        },
                        interest: {
                                en: "As per bank norms.",
                                hi: "बैंक नियमों के अनुसार।"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Apply at nearest bank or MUDRA portal.",
                                        hi: "निकटतम बैंक या मुद्रा पोर्टल पर आवेदन करें।"
                                }
                        ]
                },
                helpline: "1800-180-1111"
        },

        PMKSY: {
                scheme_id: "PMKSY",
                name: {
                        en: "Pradhan Mantri Krishi Sinchai Yojana",
                        hi: "प्रधानमंत्री कृषि सिंचाई योजना"
                },
                description: {
                        simple: {
                                en: "PMKSY supports irrigation and water efficiency projects for farmers.",
                                hi: "पीएमकेएसवाई किसानों के लिए सिंचाई और जल दक्षता परियोजनाओं का समर्थन करता है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "Eligible if you own agricultural land requiring irrigation support.",
                                hi: "यदि आपकी कृषि भूमि को सिंचाई सहायता की आवश्यकता है तो आप पात्र हैं।"
                        },
                        criteria: [
                                "Land ownership required",
                                "Water usage or irrigation need"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Land Records", required: true },
                                { name: "Bank Account Details", required: true }
                        ],
                        tenant: []
                },
                benefits: {
                        primary: {
                                en: "Subsidy for irrigation infrastructure.",
                                hi: "सिंचाई अवसंरचना के लिए सब्सिडी।"
                        },
                        amounts: {
                                en: "Subsidy varies by component and state.",
                                hi: "घटक और राज्य के अनुसार सब्सिडी भिन्न होती है।"
                        },
                        interest: {
                                en: "N/A",
                                hi: "लागू नहीं"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Apply through State Agriculture Department.",
                                        hi: "राज्य कृषि विभाग के माध्यम से आवेदन करें।"
                                }
                        ]
                },
                helpline: "State Agriculture Office"
        },

        AIF: {
                scheme_id: "AIF",
                name: {
                        en: "Agriculture Infrastructure Fund",
                        hi: "कृषि अवसंरचना कोष"
                },
                description: {
                        simple: {
                                en: "AIF provides loans for post-harvest and storage infrastructure.",
                                hi: "एआईएफ कटाई के बाद और भंडारण अवसंरचना के लिए ऋण प्रदान करता है।"
                        }
                },
                eligibility: {
                        why: {
                                en: "Eligible if you plan post-harvest or storage infrastructure.",
                                hi: "यदि आप कटाई के बाद या भंडारण अवसंरचना की योजना बना रहे हैं तो आप पात्र हैं।"
                        },
                        criteria: [
                                "Farmer / FPO / Agri entrepreneur",
                                "Infrastructure project proposal"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Project Report", required: true },
                                { name: "Bank Account Details", required: true }
                        ],
                        tenant: []
                },
                benefits: {
                        primary: {
                                en: "Long-term loans with interest subvention.",
                                hi: "ब्याज सब्सिडी के साथ दीर्घकालिक ऋण।"
                        },
                        amounts: {
                                en: "Loan up to ₹2 crore.",
                                hi: "₹2 करोड़ तक का ऋण।"
                        },
                        interest: {
                                en: "3% interest subvention.",
                                hi: "3% ब्याज सब्सिडी।"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Apply via AIF online portal or bank.",
                                        hi: "एआईएफ ऑनलाइन पोर्टल या बैंक के माध्यम से आवेदन करें।"
                                }
                        ]
                },
                helpline: "https://agriinfra.dac.gov.in"
        },

        STATE_CROP_LOAN: {
                scheme_id: "STATE_CROP_LOAN",
                name: {
                        en: "State Crop Loan Scheme",
                        hi: "राज्य फसल ऋण योजना"
                },
                description: {
                        simple: {
                                en: "State governments provide crop loans at subsidized interest rates.",
                                hi: "राज्य सरकारें रियायती ब्याज दरों पर फसल ऋण प्रदान करती हैं।"
                        }
                },
                eligibility: {
                        why: {
                                en: "Eligible based on state-specific crop loan rules.",
                                hi: "राज्य-विशिष्ट फसल ऋण नियमों के आधार पर पात्र।"
                        },
                        criteria: [
                                "Resident of the state",
                                "Crop cultivation proof"
                        ]
                },
                documents: {
                        default: [
                                { name: "Aadhaar Card", required: true },
                                { name: "Land Records", required: true },
                                { name: "State Residence Proof", required: true }
                        ],
                        tenant: []
                },
                benefits: {
                        primary: {
                                en: "Subsidized short-term crop loans.",
                                hi: "रियायती अल्पकालिक फसल ऋण।"
                        },
                        amounts: {
                                en: "Loan amount as per state norms.",
                                hi: "राज्य नियमों के अनुसार ऋण राशि।"
                        },
                        interest: {
                                en: "Lower than standard bank rates.",
                                hi: "मानक बैंक दरों से कम।"
                        }
                },
                application_steps: {
                        steps: [
                                {
                                        en: "Apply through state cooperative or rural bank.",
                                        hi: "राज्य सहकारी या ग्रामीण बैंक के माध्यम से आवेदन करें।"
                                }
                        ]
                },
                helpline: "State Agriculture Helpline"
        }

};

/**
 * Get knowledge for a specific scheme.
 */
export function getSchemeKnowledge(schemeId) {
        const key = schemeId.toUpperCase();
        return SCHEME_KNOWLEDGE[key] || null;
}

/**
 * Get specific doc type for a scheme.
 */
export function getSchemeDocType(schemeId, docType) {
        const scheme = getSchemeKnowledge(schemeId);
        if (!scheme) return null;
        return scheme[docType] || null;
}

export function getAvailableSchemes() {
        return Object.keys(SCHEME_KNOWLEDGE);
}

export default SCHEME_KNOWLEDGE;
