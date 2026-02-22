Student Project Proposal: SoS Regulatory AI Assistant 

Team Information 

Team Members: Bibas Kandel, Mandip Adhikari, Aditya Sharma, Kapil Sharma, Gunjan Sah, Saleep Shrestha 

Institution: The University of Southern Mississippi 

Date: December 8, 2025 

Team Member Bios: 

Bibas Kandel (AI and Cloud): Leads cloud environment design and AI integration, including setup and deployment of Large Language Models (LLMs). 

Mandip Adhikari (AI): Drives model development, data ingestion, and evaluation to meet the target accuracy threshold (≥ 75%). 

Aditya Sharma (Frontend and Backend): Builds and connects the user interface to backend services to deliver a seamless research/chat experience. 

Kapil Sharma (Backend): Develops APIs and data services that support document indexing, retrieval, and citation-ready outputs. 

Gunjan Sah (Project Manager): Manages timeline execution, weekly coordination with the Innovation Hub, and ensures deliverables stay on track. 

Saleep Shrestha (Frontend): Designs an accessible, intuitive chat-style interface tailored for non-technical SoS staff. 

 

Agency/Problem Area Your Project Addresses 

Mississippi Secretary of State’s Office (SoS) — Regulatory Review and Statutory Authority Verification 

 

1. Problem Understanding & Strategic Alignment 

1.1 Agency Problem Description 

The Mississippi Secretary of State’s Office carries significant oversight responsibilities, including review of administrative rules and regulations. As the number of regulations submitted each year increases, a small policy team must spend substantial time manually confirming whether each regulation is supported by the correct statutory authority. This manual approach makes it difficult to consistently and quickly trace regulatory language back to the governing law. 

1.2 Why This Problem Matters 

When regulatory review depends heavily on time-intensive manual research, the risk of delays and uneven review outcomes increases. This can slow internal workflows, reduce consistency in how authority is verified, and create avoidable strain on staff capacity. Improving the speed and reliability of authority checks supports transparent and cost-effective government operations. 

 

2. Proposed AI-Enabled Solution 

2.1 Solution Overview 

We propose a Regulatory Compliance AI Assistant delivered as a Proof of Concept (PoC) for internal SoS use. The solution will combine: 

a citation-first AI chatbot for answering staff questions, and 

an expanded research assistant capability (Phase 2) to support summarization and deeper cross-referencing. 

The assistant will be grounded in SoS-provided regulatory and statutory source documents, enabling staff to ask questions in plain language and receive responses that point back to authoritative legal text. 

2.2 Key Features & Functionality 

Plain-language Q&A for staff: Staff can ask compliance and authority questions in everyday language without needing to manually search across documents. 

Authority mapping and cross-references: The system will connect relevant regulatory passages to the statute sections that support them and highlight potential gaps or mismatches for review. 

Citation-driven responses: Each answer will include direct references to the underlying statutes/regulations used to produce the result, enabling verification and auditability. 

Phase 2 web monitoring (targeted): A focused crawler will monitor the three SoS-designated agencies for newly published or updated regulatory materials and incorporate them into the research workflow. 

Interaction logging for traceability: Usage can be recorded to support transparency, review, and continuous improvement. 

2.3 Innovation Statement 

This project demonstrates a practical way to use AI to strengthen regulatory oversight without replacing human judgment. By accelerating document cross-referencing and making statutory support easier to confirm, the assistant can reduce repetitive research burdens and improve consistency in regulatory review. 

 

3. Impact Potential and Scalability 

3.1 Expected Benefits 

Faster review and verification: Shortens the time required to locate statutory support compared to fully manual searches. 

Improved consistency: Produces standardized, citation-backed responses across staff members and use cases. 

Accuracy target and measurable performance: Designed to meet a minimum benchmark of ≥ 75% accuracy for correct statutory referencing and retrieval. 

Audit-ready outputs: Citation-backed answers and interaction logging support accountability and traceability. 

3.2 Replicability & Scalability Potential 

While the PoC will focus on designated agencies and SoS internal workflows, the underlying architecture can be extended over time to cover additional agencies, broader regulatory collections, and more advanced search and analytics features—without requiring a full redesign. 

 

4. Feasibility & Technical Approach 

4.1 Technical Feasibility 

The solution is feasible within the PoC timeline using a modern retrieval-based approach that prioritizes grounding and verification. Key implementation steps include: 

extracting text from SoS-provided PDFs (including OCR where needed), 

structuring and indexing content for retrieval, 

implementing a chatbot workflow that responds using retrieved source passages, and 

evaluating performance against accuracy and usability criteria. 

This work will be completed in a sandbox environment appropriate for PoC development and testing. 

4.2 Additional Data Requirements 

To successfully deliver the PoC, we will need access to: 

Mississippi Statutes (PDF) provided by SoS 

Administrative Authority materials (PDF) provided by SoS 

Web sources for the three designated agencies selected by SoS for Phase 2 monitoring 

 

5. Project Scope Statement 

5.1 In Scope 

Phase 1 

Build and demonstrate an internal chatbot that can answer authority-related questions using ingested statutes and regulations. 

Create linkages between regulatory text and the statute sections that justify it. 

Ensure responses are transparent, citation-supported, and appropriate for internal staff use. 

Phase 2 

Add a research assistant capability that can summarize and synthesize across multiple documents for deeper review support. 

Develop a targeted web crawler limited to the three SoS-designated agencies to identify and collect newly published or amended regulatory content. 

Integrate crawler outputs and research workflows into the same citation-backed knowledge experience. 

Maintain strong governance controls, security expectations, and transparency standards throughout. 

 

6. Timeline & Work Plan 

(Unchanged—dates and milestones preserved exactly as provided.) 

Original Timeline & Work Plan (Phase 1) 

Iterations 

Deliverables 

Planned Start Date 

Week 1 

Kickoff, Data Source Collection 

12/15/25 

Week 2 

Environment Setup, Explore LLM models 

12/22/25 

Week 3 

Data entry, Model training, Documentation 

12/29/25 

Week 4 

Readout and demo with SoS Office, Publish code 

01/05/26 

Original Timeline & Work Plan (Phase 2) 

Iterations 

Deliverables 

Planned Start Date 

Week 1 

Kickoff, Data Source Collection 

1/26/26 

Week 2 

Explore research assistant models 

2/2/26 

Week 3 

Assistant Created/Tested, Explore crawler LLMs 

2/9/26 

Week 4 

Finalize crawler functionality 

2/16/26 

Week 5 

Integrate web crawler and research assistant 

2/23/26 

Week 6 

Verify accuracy and functionality of integration 

3/2/26 

Week 7 

Readout and demo with SoS Office, Publish code 

3/9/26 

Note: Phase 2 dates remain as originally scheduled. 

 

7. Team Collaboration & Readiness 

7.1 Team Roles & Responsibilities 

Bibas & Mandip: Model selection strategy, data processing pipeline, training/evaluation, and accuracy validation. 

Aditya & Kapil: Backend services, APIs, indexing/search workflow, and crawler/database integration. 

Saleep: Frontend UI/UX for the chatbot and research workflows, ensuring accessibility for non-technical users. 

Gunjan: Project planning, meeting facilitation, milestone tracking, and stakeholder coordination. 

7.2 Required Support 

A consistent weekly touchpoint with the Innovation Hub for progress review and feedback. 

Access to SoS-provided PDF sources (statutes and administrative authority materials). 

Confirmation of the three designated agencies for Phase 2 crawling targets. 

Staff feedback during testing to validate usability and response expectations. 

 

8. Ethical, Legal, Privacy & Security Considerations 

8.1 Risks or Concerns 

Text extraction quality: OCR or PDF structure issues may introduce errors that affect retrieval and citation accuracy. 

Response reliability: The system must avoid overstating confidence or generating unsupported conclusions. 

Legal sensitivity: Outputs must not be framed as definitive legal advice or final policy determinations. 

Data security: Internal materials and system outputs must remain protected and access-controlled. 

8.2 Mitigation Plan 

Grounding and transparency by design: Responses will be citation-driven and tied directly to the underlying source material. 

Clear internal-use disclaimer: The assistant is intended to support staff analysis—not replace legal review or decision-making. 

Testing and evaluation discipline: Track accuracy against a defined benchmark and iterate based on SoS feedback. 

Secure handling practices: Follow confidentiality expectations and operate strictly within the PoC sandbox constraints. 

 

9. Additional Notes 

This project will remain a Proof of Concept and will not involve deployment into production systems or updates to any live SoS knowledge base. The goal is to demonstrate value, validate feasibility, and provide a strong foundation for potential future expansion. 

 
