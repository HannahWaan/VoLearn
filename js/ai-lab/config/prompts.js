/**
 * VoLearn AI Practice Lab - Prompts Configuration
 * Version: 1.0.0
 * 
 * Chứa các prompt templates cho AI generation
 */

// System prompts cho các AI models
export const SYSTEM_PROMPTS = {
    exercise_generator: `Bạn là một giáo viên IELTS chuyên nghiệp với 15 năm kinh nghiệm.
Nhiệm vụ: Tạo bài tập luyện từ vựng tiếng Anh cho học viên Việt Nam.

Nguyên tắc:
1. Bài tập phải phù hợp với trình độ IELTS được yêu cầu
2. Sử dụng ngữ cảnh thực tế, học thuật hoặc đời sống
3. Đảm bảo đáp án chính xác và có giải thích
4. Câu hỏi đa dạng theo thang Bloom's Taxonomy
5. Phản hồi bằng JSON hợp lệ`,

    grader: `Bạn là giám khảo IELTS chuyên nghiệp.
Nhiệm vụ: Chấm điểm và đưa ra feedback chi tiết.

Nguyên tắc:
1. Chấm điểm công bằng, khách quan
2. Giải thích lý do cho điểm số
3. Đưa ra gợi ý cải thiện cụ thể
4. Khuyến khích học viên
5. Phản hồi bằng JSON hợp lệ`,

    feedback: `Bạn là cố vấn học tập tiếng Anh.
Nhiệm vụ: Phân tích kết quả và đưa ra lời khuyên.

Nguyên tắc:
1. Phân tích điểm mạnh và điểm yếu
2. Đề xuất chiến lược học tập
3. Động viên và tạo động lực
4. Cung cấp tài liệu tham khảo nếu cần`
};

// Prompt templates theo Bloom Level
export const BLOOM_PROMPTS = {
    remember: {
        name: 'Nhớ (Remember)',
        description: 'Ghi nhớ, nhắc lại thông tin cơ bản',
        question_types: [
            'Chọn định nghĩa đúng của từ "{word}"',
            'Từ nào có nghĩa là "{definition}"?',
            'Điền từ còn thiếu: {sentence_with_blank}',
            'Nối từ với nghĩa tương ứng',
            'Chọn từ đồng nghĩa với "{word}"'
        ],
        instructions: `Tạo câu hỏi kiểm tra khả năng GHI NHỚ:
- Hỏi trực tiếp về định nghĩa, nghĩa của từ
- Yêu cầu nhận diện từ vựng
- Điền từ vào chỗ trống đơn giản
- Không yêu cầu suy luận phức tạp`
    },
    
    understand: {
        name: 'Hiểu (Understand)',
        description: 'Diễn giải, giải thích, tóm tắt',
        question_types: [
            'Giải thích nghĩa của "{word}" trong ngữ cảnh sau',
            'Câu nào diễn đạt đúng ý nghĩa của "{word}"?',
            'Tóm tắt đoạn văn sử dụng từ "{word}"',
            'Phân biệt "{word1}" và "{word2}"',
            'Chọn ví dụ minh họa đúng cho "{word}"'
        ],
        instructions: `Tạo câu hỏi kiểm tra khả năng HIỂU:
- Yêu cầu giải thích nghĩa trong ngữ cảnh
- So sánh, phân biệt từ vựng tương tự
- Diễn đạt lại bằng cách khác
- Nhận biết ví dụ đúng/sai`
    },
    
    apply: {
        name: 'Vận dụng (Apply)',
        description: 'Áp dụng kiến thức vào tình huống mới',
        question_types: [
            'Sử dụng "{word}" để hoàn thành câu',
            'Viết câu với "{word}" trong ngữ cảnh {context}',
            'Chọn từ phù hợp để điền vào đoạn văn',
            'Sửa lỗi sử dụng từ "{word}" trong câu sau',
            'Áp dụng "{word}" vào tình huống: {situation}'
        ],
        instructions: `Tạo câu hỏi kiểm tra khả năng VẬN DỤNG:
- Yêu cầu sử dụng từ trong câu/đoạn văn mới
- Điền từ vào ngữ cảnh thực tế
- Sửa lỗi sử dụng từ
- Áp dụng vào tình huống giao tiếp`
    },
    
    analyze: {
        name: 'Phân tích (Analyze)',
        description: 'Chia nhỏ, tìm mối quan hệ, so sánh',
        question_types: [
            'Phân tích cách sử dụng "{word}" trong 2 đoạn văn',
            'So sánh nghĩa của "{word}" trong các ngữ cảnh khác nhau',
            'Xác định mối quan hệ giữa các từ: {word_list}',
            'Phân tích cấu trúc từ "{word}" (gốc, tiền tố, hậu tố)',
            'Tìm pattern sử dụng của "{word}" trong các câu'
        ],
        instructions: `Tạo câu hỏi kiểm tra khả năng PHÂN TÍCH:
- So sánh cách dùng từ trong ngữ cảnh khác nhau
- Phân tích cấu trúc từ (word formation)
- Tìm mối quan hệ, pattern
- Phân biệt nghĩa literal vs figurative`
    },
    
    evaluate: {
        name: 'Đánh giá (Evaluate)',
        description: 'Đưa ra nhận xét, phán đoán dựa trên tiêu chí',
        question_types: [
            'Đánh giá câu nào sử dụng "{word}" chính xác nhất',
            'Xếp hạng các câu theo mức độ formal/informal',
            'Nhận xét về cách dùng từ trong đoạn văn',
            'Chọn từ phù hợp nhất cho academic writing',
            'Đánh giá độ phù hợp của "{word}" trong ngữ cảnh'
        ],
        instructions: `Tạo câu hỏi kiểm tra khả năng ĐÁNH GIÁ:
- Yêu cầu đánh giá độ phù hợp, chính xác
- Xếp hạng theo tiêu chí (formal, academic, etc.)
- Nhận xét, phê bình cách sử dụng
- Chọn phương án tối ưu`
    },
    
    create: {
        name: 'Sáng tạo (Create)',
        description: 'Tạo ra cái mới, thiết kế, đề xuất',
        question_types: [
            'Viết đoạn văn 50-80 từ sử dụng: {word_list}',
            'Tạo câu chuyện ngắn với các từ: {word_list}',
            'Thiết kế hội thoại sử dụng "{word}" trong ngữ cảnh {context}',
            'Viết email/letter sử dụng từ vựng cho trước',
            'Sáng tác câu ví dụ độc đáo cho "{word}"'
        ],
        instructions: `Tạo câu hỏi kiểm tra khả năng SÁNG TẠO:
- Yêu cầu viết đoạn văn, câu chuyện
- Thiết kế hội thoại, tình huống
- Tạo nội dung mới sử dụng từ vựng
- Kết hợp nhiều từ trong một sản phẩm`
    }
};

// Prompt templates theo Skill
export const SKILL_PROMPTS = {
    reading: {
        name: 'Reading',
        instructions: `Tạo bài tập READING:
- Đoạn văn 150-300 từ (tùy level)
- Chủ đề đa dạng: khoa học, xã hội, môi trường, công nghệ
- Câu hỏi: True/False/Not Given, Multiple Choice, Matching, Fill blanks
- Tích hợp từ vựng target vào đoạn văn tự nhiên`,
        
        templates: {
            passage: `Viết một đoạn văn {length} từ về chủ đề "{topic}" ở trình độ IELTS Band {band}.
Yêu cầu:
- Sử dụng TỰ NHIÊN các từ sau: {words}
- Văn phong academic
- Có introduction, body, conclusion
- Phù hợp cho bài thi IELTS Reading`,
            
            questions: `Dựa trên đoạn văn, tạo {count} câu hỏi:
- Bloom level: {bloom_level}
- Dạng: {question_types}
- Focus vào từ vựng: {target_words}`
        }
    },
    
    writing: {
        name: 'Writing',
        instructions: `Tạo bài tập WRITING:
- Task 1: Mô tả biểu đồ, quy trình, bản đồ
- Task 2: Essay (opinion, discussion, problem-solution)
- Yêu cầu sử dụng từ vựng target
- Có rubric chấm điểm`,
        
        templates: {
            task1: `Tạo đề bài IELTS Writing Task 1:
- Dạng: {chart_type}
- Chủ đề liên quan đến từ vựng: {words}
- Band target: {band}
- Kèm sample answer outline`,
            
            task2: `Tạo đề bài IELTS Writing Task 2:
- Dạng: {essay_type}
- Chủ đề cho phép sử dụng từ: {words}
- Band target: {band}
- Kèm thesis statement gợi ý`
        }
    },
    
    listening: {
        name: 'Listening',
        instructions: `Tạo bài tập LISTENING (dạng script):
- Conversation hoặc monologue
- Có transcript để đọc/nghe
- Câu hỏi: Fill blanks, Multiple choice, Matching
- Tích hợp từ vựng target`,
        
        templates: {
            conversation: `Viết script hội thoại 2 người về "{topic}":
- Độ dài: {length} từ
- Tự nhiên, có filler words
- Sử dụng từ vựng: {words}
- Kèm câu hỏi comprehension`
        }
    },
    
    speaking: {
        name: 'Speaking',
        instructions: `Tạo bài tập SPEAKING:
- Part 1: Câu hỏi ngắn về bản thân
- Part 2: Cue card mô tả
- Part 3: Thảo luận sâu
- Gợi ý sử dụng từ vựng target`,
        
        templates: {
            cue_card: `Tạo IELTS Speaking Part 2 Cue Card:
- Chủ đề cho phép dùng từ: {words}
- Có 4 bullet points hướng dẫn
- Kèm sample answer ideas
- Follow-up questions cho Part 3`
        }
    },
    
    vocabulary: {
        name: 'Vocabulary',
        instructions: `Tạo bài tập VOCABULARY thuần túy:
- Word formation (noun, verb, adj, adv)
- Collocations
- Synonyms/Antonyms
- Word families
- Context clues`,
        
        templates: {
            word_formation: `Tạo bài tập word formation với từ gốc: {words}
- Điền dạng đúng vào câu
- Bảng word family
- Câu hỏi về suffixes/prefixes`,
            
            collocations: `Tạo bài tập collocations cho từ: {words}
- Matching collocations
- Điền collocation vào câu
- Sửa lỗi collocation`
        }
    },
    
    grammar: {
        name: 'Grammar',
        instructions: `Tạo bài tập GRAMMAR tích hợp từ vựng:
- Tenses, articles, prepositions
- Sentence structure
- Error correction
- Transformation`,
        
        templates: {
            error_correction: `Tạo bài sửa lỗi ngữ pháp:
- Câu chứa từ vựng: {words}
- Lỗi về: {grammar_points}
- Có giải thích đáp án`,
            
            transformation: `Tạo bài biến đổi câu:
- Sử dụng từ cho trước: {words}
- Giữ nguyên nghĩa
- Thay đổi cấu trúc`
        }
    },
    
    pronunciation: {
        name: 'Pronunciation',
        instructions: `Tạo bài tập PRONUNCIATION:
- Stress patterns
- Phonetic transcription
- Minimal pairs
- Connected speech
- LƯU Ý: Cần đảm bảo độ chính xác cao`,
        
        templates: {
            stress: `Tạo bài tập word stress cho từ: {words}
- Đánh dấu stressed syllable
- Nhóm từ theo stress pattern
- Câu hỏi về stress rules`,
            
            phonetics: `Tạo bài tập phonetics:
- IPA transcription cho: {words}
- Matching từ với IPA
- Identify vowel/consonant sounds`
        }
    }
};

// Prompt template chính để generate exercise
export const EXERCISE_GENERATION_PROMPT = `
Tạo bài tập luyện từ vựng tiếng Anh với các thông số sau:

## THÔNG TIN ĐẦU VÀO
- Từ vựng: {vocabulary_list}
- Số lượng từ: {word_count}
- Kỹ năng: {skills}
- Trình độ IELTS: Band {ielts_band}
- Bloom Taxonomy: {bloom_distribution}
- Tỷ lệ trắc nghiệm/tự luận: {mc_ratio}% / {essay_ratio}%
- Chủ đề: {topics}

## YÊU CẦU OUTPUT
Trả về JSON với cấu trúc:
{
    "exercise_id": "unique_id",
    "title": "Tên bài tập",
    "description": "Mô tả ngắn",
    "estimated_time": minutes,
    "total_points": number,
    "sections": [
        {
            "section_id": "section_1",
            "skill": "reading|writing|listening|speaking|vocabulary|grammar|pronunciation",
            "bloom_level": "remember|understand|apply|analyze|evaluate|create",
            "instructions": "Hướng dẫn cho section",
            "content": "Nội dung (đoạn văn, audio script, etc.)",
            "questions": [
                {
                    "question_id": "q1",
                    "type": "multiple_choice|fill_blank|true_false|matching|short_answer|essay",
                    "question": "Nội dung câu hỏi",
                    "options": ["A", "B", "C", "D"] // nếu là trắc nghiệm
                    "correct_answer": "đáp án đúng",
                    "accepted_answers": ["các đáp án chấp nhận được"], // cho tự luận
                    "points": number,
                    "target_words": ["từ vựng liên quan"],
                    "explanation": "Giải thích đáp án",
                    "hints": ["gợi ý 1", "gợi ý 2"]
                }
            ]
        }
    ],
    "vocabulary_focus": [
        {
            "word": "từ",
            "definition": "nghĩa",
            "example": "câu ví dụ",
            "appears_in": ["q1", "q3"]
        }
    ]
}

## LƯU Ý QUAN TRỌNG
1. Đảm bảo từ vựng xuất hiện TỰ NHIÊN trong context
2. Câu hỏi phải RÕ RÀNG, không mơ hồ
3. Đáp án phải CHÍNH XÁC
4. Độ khó phù hợp với IELTS Band yêu cầu
5. Phân bổ Bloom levels theo yêu cầu
6. JSON phải VALID, không có trailing commas
`;

// Prompt để chấm điểm
export const GRADING_PROMPT = `
Chấm điểm bài làm của học viên:

## BÀI TẬP GỐC
{original_exercise}

## BÀI LÀM CỦA HỌC VIÊN
{student_answers}

## YÊU CẦU
Trả về JSON:
{
    "total_score": number,
    "max_score": number,
    "percentage": number,
    "ielts_band_estimate": number,
    "time_taken": seconds,
    "questions": [
        {
            "question_id": "q1",
            "student_answer": "câu trả lời",
            "correct_answer": "đáp án đúng",
            "is_correct": boolean,
            "partial_credit": number, // 0-1 cho partial correct
            "score": number,
            "feedback": "Nhận xét chi tiết"
        }
    ],
    "skill_analysis": {
        "reading": { "score": x, "max": y, "feedback": "..." },
        "writing": { "score": x, "max": y, "feedback": "..." }
        // ... other skills
    },
    "bloom_analysis": {
        "remember": { "correct": x, "total": y },
        "understand": { "correct": x, "total": y }
        // ... other levels
    },
    "vocabulary_analysis": [
        {
            "word": "từ",
            "mastery": "mastered|learning|needs_review",
            "questions_correct": x,
            "questions_total": y
        }
    ],
    "overall_feedback": "Nhận xét tổng quan",
    "improvement_suggestions": ["Gợi ý 1", "Gợi ý 2"],
    "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
    "weaknesses": ["Điểm yếu cần cải thiện"]
}

## TIÊU CHÍ CHẤM
- Trắc nghiệm: Đúng/Sai rõ ràng
- Điền từ: Chấp nhận các biến thể hợp lệ (số ít/nhiều, viết hoa/thường)
- Tự luận ngắn: Đánh giá ý chính, từ vựng, ngữ pháp
- Essay: Theo rubric IELTS (Task Response, Coherence, Lexical Resource, Grammar)
`;

// Prompt cho Daily Challenge
export const DAILY_CHALLENGE_PROMPT = `
Tạo Daily Challenge đơn giản, nhanh (3-5 phút):

## THÔNG TIN
- Từ vựng: {vocabulary_list} (chọn 5-8 từ)
- Ngày: {date}
- Streak hiện tại: {streak}

## YÊU CẦU
- 5-7 câu hỏi MIX các dạng
- Độ khó: Trung bình
- Bloom: Chủ yếu Remember, Understand, Apply
- Không quá khó để duy trì streak

## OUTPUT FORMAT
{
    "challenge_id": "daily_{date}",
    "title": "Thử thách ngày {date}",
    "questions": [...], // 5-7 câu
    "bonus_word": { // Từ mới bonus
        "word": "...",
        "definition": "...",
        "example": "..."
    },
    "motivation": "Câu động viên cho streak {streak}"
}
`;

export default {
    SYSTEM_PROMPTS,
    BLOOM_PROMPTS,
    SKILL_PROMPTS,
    EXERCISE_GENERATION_PROMPT,
    GRADING_PROMPT,
    DAILY_CHALLENGE_PROMPT
};
