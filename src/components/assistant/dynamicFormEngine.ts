export type QuestionType =
  | 'text'
  | 'number'
  | 'phone'
  | 'email'
  | 'date'
  | 'time'
  | 'select'
  | 'multiSelect'
  | 'radio'
  | 'checkbox'
  | 'photo'
  | 'video'
  | 'document'
  | 'location'
  | 'address'
  | 'otp';

export interface QuestionOption {
  label: string;
  value: string;
  icon?: string;
  badge?: string;
  description?: string;
  priceModifier?: number;
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customErrorMessage?: string;
}

export interface QuestionDependency {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'includes' | 'greaterThan' | 'lessThan' | 'isFilled';
  value?: any;
}

export interface DynamicQuestionSchema {
  id: string;
  label: string;
  hindiLabel?: string;
  type: QuestionType;
  required?: boolean;
  options?: QuestionOption[];
  validation?: QuestionValidation;
  dependsOn?: QuestionDependency;
  visibility?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
}

export interface DynamicFormSchema {
  id: string;
  title: string;
  hindiTitle?: string;
  subtitle?: string;
  category?: string;
  questions: DynamicQuestionSchema[];
  submitLabel?: string;
}

export class DynamicFormEngine {
  /**
   * Evaluates conditional visibility for a question based on current form values
   */
  public evaluateVisibility(
    question: DynamicQuestionSchema,
    formValues: Record<string, any>
  ): boolean {
    if (question.visibility === false) return false;
    if (!question.dependsOn) return true;

    const { fieldId, operator, value } = question.dependsOn;
    const targetValue = formValues[fieldId];

    if (operator === 'isFilled') {
      return targetValue !== undefined && targetValue !== null && targetValue !== '';
    }

    if (targetValue === undefined || targetValue === null) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return targetValue === value || String(targetValue).toLowerCase() === String(value).toLowerCase();
      case 'notEquals':
        return targetValue !== value && String(targetValue).toLowerCase() !== String(value).toLowerCase();
      case 'includes':
        if (Array.isArray(targetValue)) {
          return targetValue.includes(value);
        }
        return String(targetValue).toLowerCase().includes(String(value).toLowerCase());
      case 'greaterThan':
        return Number(targetValue) > Number(value);
      case 'lessThan':
        return Number(targetValue) < Number(value);
      default:
        return true;
    }
  }

  /**
   * Validates a single field value against its schema rules
   */
  public validateFieldValue(
    question: DynamicQuestionSchema,
    value: any
  ): { isValid: boolean; errorMessage?: string } {
    if (question.required) {
      const isEmpty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        return {
          isValid: false,
          errorMessage: `${question.hindiLabel || question.label} भरना अनिवार्य है।`,
        };
      }
    }

    if (value === undefined || value === null || value === '') {
      return { isValid: true };
    }

    const v = question.validation;

    // Phone validation
    if (question.type === 'phone') {
      const cleanPhone = String(value).replace(/\D/g, '');
      if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        return {
          isValid: false,
          errorMessage: 'कृपया वैध 10-अंकों का भारतीय मोबाइल नंबर दर्ज करें (6-9 से शुरू)।',
        };
      }
    }

    // Email validation
    if (question.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return {
          isValid: false,
          errorMessage: 'कृपया सही ईमेल पता दर्ज करें (उदा. example@gmail.com)।',
        };
      }
    }

    // OTP validation
    if (question.type === 'otp') {
      if (!/^\d{4}$/.test(String(value))) {
        return {
          isValid: false,
          errorMessage: 'कृपया 4-अंकों का स्टार्ट OTP दर्ज करें।',
        };
      }
    }

    // Custom Validation rules
    if (v) {
      if (typeof value === 'string') {
        if (v.minLength && value.length < v.minLength) {
          return {
            isValid: false,
            errorMessage: v.customErrorMessage || `कम से कम ${v.minLength} अक्षर आवश्यक हैं।`,
          };
        }
        if (v.maxLength && value.length > v.maxLength) {
          return {
            isValid: false,
            errorMessage: v.customErrorMessage || `अधिकतम ${v.maxLength} अक्षर अनुमत हैं।`,
          };
        }
      }

      if (typeof value === 'number') {
        if (v.min !== undefined && value < v.min) {
          return {
            isValid: false,
            errorMessage: v.customErrorMessage || `न्यूनतम मान ${v.min} होना चाहिए।`,
          };
        }
        if (v.max !== undefined && value > v.max) {
          return {
            isValid: false,
            errorMessage: v.customErrorMessage || `अधिकतम मान ${v.max} हो सकता है।`,
          };
        }
      }

      if (v.pattern && typeof value === 'string') {
        const regex = new RegExp(v.pattern);
        if (!regex.test(value)) {
          return {
            isValid: false,
            errorMessage: v.customErrorMessage || 'अमान्य प्रारूप।',
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Generates dynamic, service-specific questions tailored to user selections
   */
  public getQuestionsForService(serviceCategory: string, serviceName?: string): DynamicFormSchema {
    const category = (serviceCategory || '').toLowerCase();
    const name = (serviceName || '').toLowerCase();

    // 1. AC REPAIR & SERVICE DYNAMIC FORM
    if (category.includes('ac') || name.includes('ac') || category.includes('ऐसी')) {
      return {
        id: 'ac_service_dynamic_form',
        title: '❄️ AC सर्विस व रिपेयर विवरण (AC Service Details)',
        subtitle: 'सही स्पेयर पार्ट्स व गैस सिलेंडर लाने के लिए विवरण चुनें:',
        questions: [
          {
            id: 'acType',
            label: '1. AC का प्रकार क्या है? (AC Type)',
            hindiLabel: 'AC का प्रकार',
            type: 'radio',
            required: true,
            options: [
              { label: 'Split AC (स्प्लिट एसी)', value: 'split', icon: 'Wind', badge: 'लोकप्रिय' },
              { label: 'Window AC (विंडो एसी)', value: 'window', icon: 'Square' },
              { label: 'Cassette AC (कैसेट एसी)', value: 'cassette', icon: 'Box' },
              { label: 'Tower AC (टावर एसी)', value: 'tower', icon: 'Columns' },
            ],
          },
          {
            id: 'acTonnage',
            label: '2. AC की क्षमता (Tonnage) कितनी है?',
            hindiLabel: 'AC Tonnage',
            type: 'select',
            required: true,
            options: [
              { label: '1.0 Ton (टन)', value: '1.0' },
              { label: '1.5 Ton (टन - स्टैंडर्ड)', value: '1.5' },
              { label: '2.0 Ton (टन)', value: '2.0' },
              { label: '2.5+ Ton (कॉर्मशियल)', value: '2.5+' },
            ],
          },
          {
            id: 'acInverterType',
            label: '3. क्या आपका AC Inverter टेक्नोलॉजी का है?',
            type: 'radio',
            required: true,
            options: [
              { label: 'Inverter AC (इन्वर्टर एसी - R32/R410 Gas)', value: 'inverter' },
              { label: 'Non-Inverter AC (साधारण एसी - R22 Gas)', value: 'non_inverter' },
            ],
          },
          {
            id: 'issueType',
            label: '4. मुख्य समस्या क्या है?',
            type: 'multiSelect',
            required: true,
            options: [
              { label: 'कूलिंग नहीं हो रही (No Cooling)', value: 'no_cooling' },
              { label: 'पानी टपक रहा है (Water Leakage)', value: 'water_leakage' },
              { label: 'गैस रीफिल / लीक मरम्मत (Gas Refill)', value: 'gas_refill' },
              { label: 'तेज आवाज / वाइब्रेशन (Noise/Vibration)', value: 'noise' },
              { label: 'जेट पंप डीप वॉश (Foam Wash)', value: 'foam_wash' },
            ],
          },
          // CONDITIONAL QUESTION 1: Shown ONLY if Gas Refill or Split AC selected
          {
            id: 'outdoorAccessibility',
            label: '5. आउटडोर (Outdoor) यूनिट कहाँ लगा है?',
            hindiLabel: 'आउटडोर यूनिट लोकेशन',
            type: 'radio',
            required: true,
            dependsOn: { fieldId: 'acType', operator: 'equals', value: 'split' },
            options: [
              { label: 'बालकनी / आसानी से सुलभ (Easily Accessible)', value: 'easy' },
              { label: 'ऊँची दीवार पर (High Wall / Ladder Required)', value: 'ladder' },
              { label: 'छत पर (Rooftop)', value: 'roof' },
            ],
            helpText: 'सीढ़ी (Ladder) व सेफ्टी हार्नेस की जरूरत जानने के लिए',
          },
          // CONDITIONAL QUESTION 2: Media Attachment
          {
            id: 'acPhoto',
            label: '6. (ऐच्छिक) AC यूनिट या एरर कोड की फोटो/वीडियो अपलोड करें:',
            type: 'photo',
            required: false,
            helpText: 'तकनीशियन को सही टूल्स लाने में मदद मिलेगी',
          },
        ],
        submitLabel: 'विवरण सुरक्षित करें व स्लॉट चुनें',
      };
    }

    // 2. ELECTRICIAN DYNAMIC FORM
    if (category.includes('electric') || name.includes('fan') || name.includes('switch') || category.includes('बिजली')) {
      return {
        id: 'electrical_dynamic_form',
        title: '⚡ इलेक्ट्रिकल रिपेयर व फिटिंग विवरण',
        subtitle: 'सही कारीगर व स्पेयर पार्ट्स असाइन करने के लिए विवरण बताएं:',
        questions: [
          {
            id: 'electricalCategory',
            label: '1. किस उपकरण/काम के लिए मदद चाहिए?',
            type: 'radio',
            required: true,
            options: [
              { label: 'सीलिंग पंखा / एग्जॉस्ट पंखा (Fan)', value: 'fan', icon: 'Zap' },
              { label: 'स्विच, सॉकेट व बोर्ड (Switchboard)', value: 'switchboard', icon: 'Sliders' },
              { label: 'शॉर्ट सर्किट / लाइट नहीं आ रही', value: 'short_circuit', icon: 'AlertTriangle' },
              { label: 'MCB / इन्वर्टर / मेन लाइन', value: 'mcb_inverter', icon: 'ShieldCheck' },
            ],
          },
          // CONDITIONAL QUESTION 1: Fan specific
          {
            id: 'fanCount',
            label: '2. कितने पंखों में काम होना है?',
            type: 'number',
            required: true,
            dependsOn: { fieldId: 'electricalCategory', operator: 'equals', value: 'fan' },
            defaultValue: 1,
            validation: { min: 1, max: 10 },
          },
          // CONDITIONAL QUESTION 2: Short Circuit urgency
          {
            id: 'circuitUrgency',
            label: '3. क्या इमरजेंसी सर्विस चाहिए (अगले 60 मिनट में)?',
            type: 'radio',
            required: true,
            dependsOn: { fieldId: 'electricalCategory', operator: 'equals', value: 'short_circuit' },
            options: [
              { label: '⚡ तत्काल इमरजेंसी (Express 60 Min Arrival)', value: 'express', badge: 'फास्ट' },
              { label: '📅 आज सुविधाजनक समय पर', value: 'standard' },
            ],
          },
          {
            id: 'faultPhoto',
            label: '4. स्विचबोर्ड या फॉल्ट की फोटो संलग्न करें:',
            type: 'photo',
            required: false,
          },
        ],
        submitLabel: 'इलेक्ट्रिशियन रिपेयर स्लॉट चुनें',
      };
    }

    // 3. PLUMBING DYNAMIC FORM
    if (category.includes('plumb') || name.includes('tap') || name.includes('tank') || category.includes('नल')) {
      return {
        id: 'plumbing_dynamic_form',
        title: '🔧 प्लंबिंग व टंकी सफाई विवरण',
        subtitle: 'समस्या के अनुसार सही प्लंबर डिस्पैच किया जाएगा:',
        questions: [
          {
            id: 'plumbingWork',
            label: '1. क्या काम कराना है?',
            type: 'radio',
            required: true,
            options: [
              { label: 'नल लीकेज / शावर फिटिंग (Tap & Shower)', value: 'tap_leak' },
              { label: 'पानी टंकी 5-स्टेज सफाई (Tank Clean)', value: 'tank_clean' },
              { label: 'पानी मोटर / पम्प रिपेयर (Motor Pump)', value: 'motor_pump' },
              { label: 'पाइप लीकेज व ब्लॉक सीवेज (Pipe Leak)', value: 'pipe_block' },
            ],
          },
          // CONDITIONAL: Tank Capacity
          {
            id: 'tankCapacity',
            label: '2. टंकी की क्षमता (Liters) कितनी है?',
            type: 'select',
            required: true,
            dependsOn: { fieldId: 'plumbingWork', operator: 'equals', value: 'tank_clean' },
            options: [
              { label: '500 Liters (लीटर)', value: '500' },
              { label: '1000 Liters (लीटर - मानक)', value: '1000' },
              { label: '2000+ Liters (बड़ी टंकी)', value: '2000' },
            ],
          },
          // CONDITIONAL: Motor Type
          {
            id: 'motorType',
            label: '3. मोटर का प्रकार क्या है?',
            type: 'radio',
            required: true,
            dependsOn: { fieldId: 'plumbingWork', operator: 'equals', value: 'motor_pump' },
            options: [
              { label: '0.5 HP / 1 HP मोनोब्लॉक मोटर', value: 'monoblock' },
              { label: 'समरसेबल मोटर (Submersible Pump)', value: 'submersible' },
            ],
          },
        ],
        submitLabel: 'प्लंबर स्लॉट बुक करें',
      };
    }

    // 4. DEEP CLEANING DYNAMIC FORM
    if (category.includes('clean') || name.includes('clean') || category.includes('सफाई')) {
      return {
        id: 'cleaning_dynamic_form',
        title: '🧹 डीप क्लीनिंग व सेनेटाइजेशन विवरण',
        subtitle: 'क्षेत्रफल व सामान के हिसाब से टीम भेजी जाएगी:',
        questions: [
          {
            id: 'cleaningScope',
            label: '1. सफाई का प्रकार चुनें:',
            type: 'radio',
            required: true,
            options: [
              { label: 'पूरा घर (Full Home Deep Cleaning)', value: 'full_home' },
              { label: 'किचन डीप क्लीनिंग (Kitchen Only)', value: 'kitchen' },
              { label: 'बाथरूम डीप सैनिटाइजेशन (Bathroom)', value: 'bathroom' },
              { label: 'सोफा व गद्दे ड्राई क्लीन (Sofa/Mattress)', value: 'sofa' },
            ],
          },
          // CONDITIONAL: BHK size
          {
            id: 'bhkSize',
            label: '2. मकान / फ्लैट का साइज क्या है?',
            type: 'select',
            required: true,
            dependsOn: { fieldId: 'cleaningScope', operator: 'equals', value: 'full_home' },
            options: [
              { label: '1 BHK / 1 Room', value: '1bhk' },
              { label: '2 BHK (मानक)', value: '2bhk' },
              { label: '3 BHK', value: '3bhk' },
              { label: '4 BHK / विला / डुप्लेक्स', value: 'villa' },
            ],
          },
        ],
        submitLabel: 'क्लीनिंग स्लॉट बुक करें',
      };
    }

    // DEFAULT DYNAMIC FORM
    return {
      id: 'general_service_form',
      title: '🛠️ होम सर्विस विवरण',
      subtitle: 'आपकी आवश्यकता दर्ज करें:',
      questions: [
        {
          id: 'problemDetails',
          label: '1. कृपया काम या समस्या का विवरण बताएं:',
          type: 'text',
          required: true,
          placeholder: 'उदा. नल टपक रहा है या पंखा धीरे चल रहा है...',
        },
        {
          id: 'urgency',
          label: '2. आप कब सर्विस चाहते हैं?',
          type: 'radio',
          required: true,
          options: [
            { label: '⚡ तत्काल (अगले 60 मिनट में Express)', value: 'express' },
            { label: '📅 आज सुविधाजनक समय पर', value: 'today' },
            { label: '📅 कल या बाद में', value: 'later' },
          ],
        },
      ],
      submitLabel: 'आगे बढ़ें',
    };
  }
}

export const dynamicFormEngine = new DynamicFormEngine();
