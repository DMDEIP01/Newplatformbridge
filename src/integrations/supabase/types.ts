export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      claim_fulfillment: {
        Row: {
          appointment_date: string | null
          appointment_slot: string | null
          ber_reason: string | null
          claim_id: string
          created_at: string
          device_value: number | null
          engineer_reference: string | null
          excess_amount: number | null
          excess_paid: boolean
          excess_payment_date: string | null
          excess_payment_method: string | null
          fulfillment_type: string | null
          id: string
          inspection_notes: string | null
          inspection_photos: string[] | null
          logistics_reference: string | null
          notes: string | null
          quote_amount: number | null
          quote_rejection_reason: string | null
          quote_status: string | null
          repair_outcome: string | null
          repair_scheduled_date: string | null
          repair_scheduled_slot: string | null
          repairer_id: string | null
          repairer_report: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date?: string | null
          appointment_slot?: string | null
          ber_reason?: string | null
          claim_id: string
          created_at?: string
          device_value?: number | null
          engineer_reference?: string | null
          excess_amount?: number | null
          excess_paid?: boolean
          excess_payment_date?: string | null
          excess_payment_method?: string | null
          fulfillment_type?: string | null
          id?: string
          inspection_notes?: string | null
          inspection_photos?: string[] | null
          logistics_reference?: string | null
          notes?: string | null
          quote_amount?: number | null
          quote_rejection_reason?: string | null
          quote_status?: string | null
          repair_outcome?: string | null
          repair_scheduled_date?: string | null
          repair_scheduled_slot?: string | null
          repairer_id?: string | null
          repairer_report?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string | null
          appointment_slot?: string | null
          ber_reason?: string | null
          claim_id?: string
          created_at?: string
          device_value?: number | null
          engineer_reference?: string | null
          excess_amount?: number | null
          excess_paid?: boolean
          excess_payment_date?: string | null
          excess_payment_method?: string | null
          fulfillment_type?: string | null
          id?: string
          inspection_notes?: string | null
          inspection_photos?: string[] | null
          logistics_reference?: string | null
          notes?: string | null
          quote_amount?: number | null
          quote_rejection_reason?: string | null
          quote_status?: string | null
          repair_outcome?: string | null
          repair_scheduled_date?: string | null
          repair_scheduled_slot?: string | null
          repairer_id?: string | null
          repairer_report?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_fulfillment_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: true
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_fulfillment_repairer_id_fkey"
            columns: ["repairer_id"]
            isOneToOne: false
            referencedRelation: "repairers"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_status_history: {
        Row: {
          claim_id: string
          created_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["claim_status"]
        }
        Insert: {
          claim_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status: Database["public"]["Enums"]["claim_status"]
        }
        Update: {
          claim_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Relationships: [
          {
            foreignKeyName: "claim_status_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          claim_number: string
          claim_type: Database["public"]["Enums"]["claim_type"]
          consultant_id: string | null
          decision: string | null
          decision_reason: string | null
          description: string
          has_receipt: boolean
          id: string
          policy_id: string
          product_condition: string | null
          status: Database["public"]["Enums"]["claim_status"]
          submitted_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claim_number: string
          claim_type: Database["public"]["Enums"]["claim_type"]
          consultant_id?: string | null
          decision?: string | null
          decision_reason?: string | null
          description: string
          has_receipt?: boolean
          id?: string
          policy_id: string
          product_condition?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          submitted_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claim_number?: string
          claim_type?: Database["public"]["Enums"]["claim_type"]
          consultant_id?: string | null
          decision?: string | null
          decision_reason?: string | null
          description?: string
          has_receipt?: boolean
          id?: string
          policy_id?: string
          product_condition?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          submitted_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claims_sla: {
        Row: {
          claim_status: Database["public"]["Enums"]["claim_status"]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          program_id: string | null
          sla_hours: number
          updated_at: string | null
        }
        Insert: {
          claim_status: Database["public"]["Enums"]["claim_status"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          program_id?: string | null
          sla_hours: number
          updated_at?: string | null
        }
        Update: {
          claim_status?: Database["public"]["Enums"]["claim_status"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          program_id?: string | null
          sla_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_sla_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message_body: string
          status: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_body: string
          status: string
          subject: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_body?: string
          status?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      complaint_activity_log: {
        Row: {
          action_details: string | null
          action_type: string
          complaint_id: string
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          action_details?: string | null
          action_type: string
          complaint_id: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          action_details?: string | null
          action_type?: string
          complaint_id?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_activity_log_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          classification: string | null
          complaint_reference: string
          complaint_type: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          details: string
          id: string
          notes: string | null
          policy_id: string | null
          reason: Database["public"]["Enums"]["complaint_reason"]
          response: string | null
          response_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          classification?: string | null
          complaint_reference?: string
          complaint_type?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          details: string
          id?: string
          notes?: string | null
          policy_id?: string | null
          reason: Database["public"]["Enums"]["complaint_reason"]
          response?: string | null
          response_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          classification?: string | null
          complaint_reference?: string
          complaint_type?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          details?: string
          id?: string
          notes?: string | null
          policy_id?: string | null
          reason?: Database["public"]["Enums"]["complaint_reason"]
          response?: string | null
          response_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      covered_items: {
        Row: {
          added_date: string
          created_at: string
          id: string
          model: string | null
          policy_id: string
          product_name: string
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
        }
        Insert: {
          added_date?: string
          created_at?: string
          id?: string
          model?: string | null
          policy_id: string
          product_name: string
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
        }
        Update: {
          added_date?: string
          created_at?: string
          id?: string
          model?: string | null
          policy_id?: string
          product_name?: string
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "covered_items_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: true
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      device_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          manufacturer_warranty_months: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer_warranty_months?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer_warranty_months?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          device_category: string
          external_reference: string | null
          id: string
          include_in_promos: boolean
          manufacturer: string
          manufacturer_warranty_months: number | null
          model_name: string
          price_expiry: string | null
          refurb_buy: number | null
          rrp: number
          trade_in_faulty: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_category: string
          external_reference?: string | null
          id?: string
          include_in_promos?: boolean
          manufacturer: string
          manufacturer_warranty_months?: number | null
          model_name: string
          price_expiry?: string | null
          refurb_buy?: number | null
          rrp: number
          trade_in_faulty?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_category?: string
          external_reference?: string | null
          id?: string
          include_in_promos?: boolean
          manufacturer?: string
          manufacturer_warranty_months?: number | null
          model_name?: string
          price_expiry?: string | null
          refurb_buy?: number | null
          rrp?: number
          trade_in_faulty?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          claim_id: string | null
          document_subtype:
            | Database["public"]["Enums"]["document_subtype"]
            | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          metadata: Json | null
          policy_id: string | null
          service_request_id: string | null
          uploaded_date: string
          user_id: string
        }
        Insert: {
          claim_id?: string | null
          document_subtype?:
            | Database["public"]["Enums"]["document_subtype"]
            | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          policy_id?: string | null
          service_request_id?: string | null
          uploaded_date?: string
          user_id: string
        }
        Update: {
          claim_id?: string | null
          document_subtype?:
            | Database["public"]["Enums"]["document_subtype"]
            | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          policy_id?: string | null
          service_request_id?: string | null
          uploaded_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_assignments: {
        Row: {
          created_at: string
          device_category: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          model_name: string | null
          product_id: string | null
          program_ids: string[] | null
          repairer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_category?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          model_name?: string | null
          product_id?: string | null
          program_ids?: string[] | null
          repairer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_category?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          model_name?: string | null
          product_id?: string | null
          program_ids?: string[] | null
          repairer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_assignments_repairer_id_fkey"
            columns: ["repairer_id"]
            isOneToOne: false
            referencedRelation: "repairers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          claim_id: string | null
          created_at: string
          id: string
          payment_date: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          policy_id: string | null
          reference_number: string
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          claim_id?: string | null
          created_at?: string
          id?: string
          payment_date?: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          policy_id?: string | null
          reference_number: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          claim_id?: string | null
          created_at?: string
          id?: string
          payment_date?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          policy_id?: string | null
          reference_number?: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perils: {
        Row: {
          acceptance_logic: Json | null
          created_at: string
          description: string | null
          evidence_requirements: Json | null
          id: string
          is_active: boolean
          name: string
          rejection_terms: Json | null
          updated_at: string
        }
        Insert: {
          acceptance_logic?: Json | null
          created_at?: string
          description?: string | null
          evidence_requirements?: Json | null
          id?: string
          is_active?: boolean
          name: string
          rejection_terms?: Json | null
          updated_at?: string
        }
        Update: {
          acceptance_logic?: Json | null
          created_at?: string
          description?: string | null
          evidence_requirements?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          rejection_terms?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          cancellation_details: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          consultant_id: string | null
          created_at: string
          customer_address_line1: string | null
          customer_address_line2: string | null
          customer_city: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_postcode: string | null
          id: string
          notes: string | null
          original_premium: number | null
          policy_number: string
          product_id: string
          program_id: string | null
          promotion_id: string | null
          promotional_premium: number | null
          renewal_date: string
          start_date: string
          status: Database["public"]["Enums"]["policy_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancellation_details?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          consultant_id?: string | null
          created_at?: string
          customer_address_line1?: string | null
          customer_address_line2?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_postcode?: string | null
          id?: string
          notes?: string | null
          original_premium?: number | null
          policy_number: string
          product_id: string
          program_id?: string | null
          promotion_id?: string | null
          promotional_premium?: number | null
          renewal_date: string
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancellation_details?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          consultant_id?: string | null
          created_at?: string
          customer_address_line1?: string | null
          customer_address_line2?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_postcode?: string | null
          id?: string
          notes?: string | null
          original_premium?: number | null
          policy_number?: string
          product_id?: string
          program_id?: string | null
          promotion_id?: string | null
          promotional_premium?: number | null
          renewal_date?: string
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_action_history: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          policy_id: string
          user_id: string
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          policy_id: string
          user_id: string
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          policy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_action_history_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_change_history: {
        Row: {
          change_type: string
          changed_at: string
          created_at: string
          id: string
          new_premium: number
          new_product_id: string
          old_premium: number
          old_product_id: string
          policy_id: string
          premium_difference: number
          reason: string | null
          user_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          created_at?: string
          id?: string
          new_premium: number
          new_product_id: string
          old_premium: number
          old_product_id: string
          policy_id: string
          premium_difference: number
          reason?: string | null
          user_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          created_at?: string
          id?: string
          new_premium?: number
          new_product_id?: string
          old_premium?: number
          old_product_id?: string
          policy_id?: string
          premium_difference?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_change_history_new_product_id_fkey"
            columns: ["new_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_change_history_old_product_id_fkey"
            columns: ["old_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_change_history_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_communications: {
        Row: {
          claim_id: string | null
          communication_type: string
          complaint_id: string | null
          created_at: string
          id: string
          message_body: string
          policy_id: string
          read_at: string | null
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          claim_id?: string | null
          communication_type: string
          complaint_id?: string | null
          created_at?: string
          id?: string
          message_body: string
          policy_id: string
          read_at?: string | null
          sent_at?: string
          status: string
          subject: string
        }
        Update: {
          claim_id?: string | null
          communication_type?: string
          complaint_id?: string | null
          created_at?: string
          id?: string
          message_body?: string
          policy_id?: string
          read_at?: string | null
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_communications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_communications_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_communications_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_communication_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_communication_templates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_communication_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      product_document_templates: {
        Row: {
          created_at: string
          document_subtype: string
          id: string
          is_active: boolean
          product_id: string
          template_content: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_subtype: string
          id?: string
          is_active?: boolean
          product_id: string
          template_content: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_subtype?: string
          id?: string
          is_active?: boolean
          product_id?: string
          template_content?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_document_templates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_promotions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          promotion_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          promotion_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_promotions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          coverage: string[]
          created_at: string
          device_categories: string[] | null
          eligibility_rules: Json | null
          excess_1: number
          excess_2: number | null
          fulfillment_method: string | null
          id: string
          is_active: boolean
          link_code: string | null
          monthly_premium: number
          name: string
          payment_types: string[] | null
          peril_details: Json | null
          perils: string[] | null
          policy_term_years: number | null
          premium_frequency: string | null
          product_id: string
          product_name_external: string | null
          product_parameters: Json | null
          promotion: string | null
          renewal_rules: Json | null
          rrp_max: number | null
          rrp_min: number
          store_commission: number
          tax_name: string | null
          tax_type: string | null
          tax_value: number | null
          tax_value_type: string | null
          tier: number
          type: string
          validity_rules: Json | null
          voucher_options: string[] | null
        }
        Insert: {
          coverage: string[]
          created_at?: string
          device_categories?: string[] | null
          eligibility_rules?: Json | null
          excess_1: number
          excess_2?: number | null
          fulfillment_method?: string | null
          id?: string
          is_active?: boolean
          link_code?: string | null
          monthly_premium: number
          name: string
          payment_types?: string[] | null
          peril_details?: Json | null
          perils?: string[] | null
          policy_term_years?: number | null
          premium_frequency?: string | null
          product_id: string
          product_name_external?: string | null
          product_parameters?: Json | null
          promotion?: string | null
          renewal_rules?: Json | null
          rrp_max?: number | null
          rrp_min: number
          store_commission?: number
          tax_name?: string | null
          tax_type?: string | null
          tax_value?: number | null
          tax_value_type?: string | null
          tier?: number
          type?: string
          validity_rules?: Json | null
          voucher_options?: string[] | null
        }
        Update: {
          coverage?: string[]
          created_at?: string
          device_categories?: string[] | null
          eligibility_rules?: Json | null
          excess_1?: number
          excess_2?: number | null
          fulfillment_method?: string | null
          id?: string
          is_active?: boolean
          link_code?: string | null
          monthly_premium?: number
          name?: string
          payment_types?: string[] | null
          peril_details?: Json | null
          perils?: string[] | null
          policy_term_years?: number | null
          premium_frequency?: string | null
          product_id?: string
          product_name_external?: string | null
          product_parameters?: Json | null
          promotion?: string | null
          renewal_rules?: Json | null
          rrp_max?: number | null
          rrp_min?: number
          store_commission?: number
          tax_name?: string | null
          tax_type?: string | null
          tax_value?: number | null
          tax_value_type?: string | null
          tier?: number
          type?: string
          validity_rules?: Json | null
          voucher_options?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          phone: string | null
          postcode: string | null
          repairer_id: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          must_change_password?: boolean
          phone?: string | null
          postcode?: string | null
          repairer_id?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          phone?: string | null
          postcode?: string | null
          repairer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_repairer_id_fkey"
            columns: ["repairer_id"]
            isOneToOne: false
            referencedRelation: "repairers"
            referencedColumns: ["id"]
          },
        ]
      }
      program_products: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          program_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          program_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_products_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          data_isolation_enabled: boolean
          description: string | null
          id: string
          is_active: boolean
          name: string
          reference_formats: Json | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_isolation_enabled?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          reference_formats?: Json | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_isolation_enabled?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          reference_formats?: Json | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          current_uses: number
          description: string | null
          discount_value: number | null
          end_date: string
          free_months: number | null
          id: string
          is_active: boolean
          logo_url: string | null
          max_uses: number | null
          promo_code: string
          promo_name: string
          promo_type: string
          start_date: string
          terms_conditions: string | null
          updated_at: string
          voucher_value: number | null
        }
        Insert: {
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_value?: number | null
          end_date: string
          free_months?: number | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_uses?: number | null
          promo_code: string
          promo_name: string
          promo_type: string
          start_date: string
          terms_conditions?: string | null
          updated_at?: string
          voucher_value?: number | null
        }
        Update: {
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_value?: number | null
          end_date?: string
          free_months?: number | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_uses?: number | null
          promo_code?: string
          promo_name?: string
          promo_type?: string
          start_date?: string
          terms_conditions?: string | null
          updated_at?: string
          voucher_value?: number | null
        }
        Relationships: []
      }
      repair_costs: {
        Row: {
          added_by: string
          amount: number
          claim_id: string
          cost_type: string
          created_at: string | null
          description: string
          fulfillment_id: string
          id: string
          units: number
          updated_at: string | null
        }
        Insert: {
          added_by: string
          amount: number
          claim_id: string
          cost_type: string
          created_at?: string | null
          description: string
          fulfillment_id: string
          id?: string
          units?: number
          updated_at?: string | null
        }
        Update: {
          added_by?: string
          amount?: number
          claim_id?: string
          cost_type?: string
          created_at?: string | null
          description?: string
          fulfillment_id?: string
          id?: string
          units?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_costs_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_costs_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "claim_fulfillment"
            referencedColumns: ["id"]
          },
        ]
      }
      repairer_slas: {
        Row: {
          availability_hours: string | null
          created_at: string
          device_category: string
          id: string
          notes: string | null
          quality_score: number | null
          repair_time_hours: number
          repairer_id: string
          response_time_hours: number
          success_rate: number | null
          updated_at: string
        }
        Insert: {
          availability_hours?: string | null
          created_at?: string
          device_category: string
          id?: string
          notes?: string | null
          quality_score?: number | null
          repair_time_hours?: number
          repairer_id: string
          response_time_hours?: number
          success_rate?: number | null
          updated_at?: string
        }
        Update: {
          availability_hours?: string | null
          created_at?: string
          device_category?: string
          id?: string
          notes?: string | null
          quality_score?: number | null
          repair_time_hours?: number
          repairer_id?: string
          response_time_hours?: number
          success_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repairer_slas_repairer_id_fkey"
            columns: ["repairer_id"]
            isOneToOne: false
            referencedRelation: "repairers"
            referencedColumns: ["id"]
          },
        ]
      }
      repairers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string
          connectivity_type: string | null
          contact_email: string
          contact_phone: string | null
          country: string | null
          coverage_areas: string[] | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          postcode: string | null
          specializations: string[] | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name: string
          connectivity_type?: string | null
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          coverage_areas?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          postcode?: string | null
          specializations?: string[] | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string
          connectivity_type?: string | null
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          coverage_areas?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          postcode?: string | null
          specializations?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      service_request_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_by_agent: boolean
          role: string
          service_request_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_by_agent?: boolean
          role: string
          service_request_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_by_agent?: boolean
          role?: string
          service_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_messages_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          claim_id: string | null
          created_at: string
          created_by: string | null
          customer_email: string
          customer_name: string
          department: string | null
          details: string
          id: string
          last_activity_at: string | null
          policy_id: string | null
          reason: string
          request_reference: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email: string
          customer_name: string
          department?: string | null
          details: string
          id?: string
          last_activity_at?: string | null
          policy_id?: string | null
          reason: string
          request_reference?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string
          customer_name?: string
          department?: string | null
          details?: string
          id?: string
          last_activity_at?: string | null
          policy_id?: string | null
          reason?: string
          request_reference?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_permissions: {
        Row: {
          allowed_sections: Database["public"]["Enums"]["retail_portal_section"][]
          created_at: string
          group_id: string
          id: string
          program_id: string
          updated_at: string
        }
        Insert: {
          allowed_sections?: Database["public"]["Enums"]["retail_portal_section"][]
          created_at?: string
          group_id: string
          id?: string
          program_id: string
          updated_at?: string
        }
        Update: {
          allowed_sections?: Database["public"]["Enums"]["retail_portal_section"][]
          created_at?: string
          group_id?: string
          id?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_permissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_pins: {
        Row: {
          created_at: string | null
          id: string
          must_change_pin: boolean | null
          pin_hash: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          must_change_pin?: boolean | null
          pin_hash: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          must_change_pin?: boolean | null
          pin_hash?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          payment_email_reminder: boolean
          payment_reminder_days: number
          payment_sms_reminder: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_email_reminder?: boolean
          payment_reminder_days?: number
          payment_sms_reminder?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_email_reminder?: boolean
          payment_reminder_days?: number
          payment_sms_reminder?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_program_permissions: {
        Row: {
          allowed_sections: Database["public"]["Enums"]["retail_portal_section"][]
          created_at: string
          id: string
          program_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_sections?: Database["public"]["Enums"]["retail_portal_section"][]
          created_at?: string
          id?: string
          program_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_sections?: Database["public"]["Enums"]["retail_portal_section"][]
          created_at?: string
          id?: string
          program_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_permissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          program_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      consultant_profiles_view: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          program_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_stats: {
        Row: {
          active_policies: number | null
          consultant_id: string | null
          consultant_name: string | null
          sale_month: string | null
          total_policies_sold: number | null
          total_premium_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_claim_number: { Args: { product_name: string }; Returns: string }
      generate_complaint_reference: { Args: never; Returns: string }
      generate_policy_number: {
        Args: { product_name: string }
        Returns: string
      }
      generate_service_request_reference: { Args: never; Returns: string }
      get_product_prefix: { Args: { product_name: string }; Returns: string }
      get_program_consultants: {
        Args: { target_program_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          program_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _program_id?: string
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      has_section_access: {
        Args: {
          _program_id: string
          _section: Database["public"]["Enums"]["retail_portal_section"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_pin: {
        Args: { pin_attempt: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "consultant"
        | "customer"
        | "complaints_agent"
        | "retail_agent"
        | "claims_agent"
        | "repairer_agent"
        | "system_admin"
        | "commercial_agent"
        | "backoffice_agent"
      claim_status:
        | "notified"
        | "accepted"
        | "rejected"
        | "referred"
        | "inbound_logistics"
        | "repair"
        | "outbound_logistics"
        | "closed"
        | "referred_pending_info"
        | "excess_due"
        | "excess_paid_fulfillment_pending"
        | "fulfillment_inspection_booked"
        | "estimate_received"
        | "fulfillment_outcome"
        | "referred_info_received"
        | "pending_fulfillment"
      claim_type: "breakdown" | "damage" | "theft"
      complaint_reason:
        | "claim_processing"
        | "customer_service"
        | "policy_terms"
        | "payment_issue"
        | "product_coverage"
        | "other"
      document_subtype:
        | "ipid"
        | "terms_conditions"
        | "policy_schedule"
        | "receipt"
        | "other"
      document_type: "policy" | "receipt" | "photo" | "other"
      payment_status: "pending" | "paid" | "failed"
      payment_type: "premium" | "excess"
      policy_status: "active" | "expired" | "cancelled" | "pending"
      retail_portal_section:
        | "dashboard"
        | "sales"
        | "policy_search"
        | "make_claim"
        | "claims"
        | "claims_management"
        | "complaints_management"
        | "repairer_jobs"
        | "service_request"
        | "reports"
        | "consultants"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "consultant",
        "customer",
        "complaints_agent",
        "retail_agent",
        "claims_agent",
        "repairer_agent",
        "system_admin",
        "commercial_agent",
        "backoffice_agent",
      ],
      claim_status: [
        "notified",
        "accepted",
        "rejected",
        "referred",
        "inbound_logistics",
        "repair",
        "outbound_logistics",
        "closed",
        "referred_pending_info",
        "excess_due",
        "excess_paid_fulfillment_pending",
        "fulfillment_inspection_booked",
        "estimate_received",
        "fulfillment_outcome",
        "referred_info_received",
        "pending_fulfillment",
      ],
      claim_type: ["breakdown", "damage", "theft"],
      complaint_reason: [
        "claim_processing",
        "customer_service",
        "policy_terms",
        "payment_issue",
        "product_coverage",
        "other",
      ],
      document_subtype: [
        "ipid",
        "terms_conditions",
        "policy_schedule",
        "receipt",
        "other",
      ],
      document_type: ["policy", "receipt", "photo", "other"],
      payment_status: ["pending", "paid", "failed"],
      payment_type: ["premium", "excess"],
      policy_status: ["active", "expired", "cancelled", "pending"],
      retail_portal_section: [
        "dashboard",
        "sales",
        "policy_search",
        "make_claim",
        "claims",
        "claims_management",
        "complaints_management",
        "repairer_jobs",
        "service_request",
        "reports",
        "consultants",
      ],
    },
  },
} as const
