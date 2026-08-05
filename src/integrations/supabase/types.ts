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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          reason: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          bank_account_no: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          default_terms: string | null
          default_transport: string | null
          email: string | null
          financial_year_start: string | null
          gstin: string | null
          id: string
          invoice_prefix: string | null
          jurisdiction: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          next_invoice_number: number | null
          owner_id: string
          owner_phone: string | null
          pan: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          default_terms?: string | null
          default_transport?: string | null
          email?: string | null
          financial_year_start?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string | null
          jurisdiction?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          next_invoice_number?: number | null
          owner_id: string
          owner_phone?: string | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          default_terms?: string | null
          default_transport?: string | null
          email?: string | null
          financial_year_start?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string | null
          jurisdiction?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          next_invoice_number?: number | null
          owner_id?: string
          owner_phone?: string | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          code: string
          company_id: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["company_role"]
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code: string
          company_id: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["company_role"]
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string
          company_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["company_role"]
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["company_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          expense_date: string
          id: string
          notes: string | null
          payment_mode: string | null
        }
        Insert: {
          amount: number
          category: string
          company_id: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_mode?: string | null
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          cgst: number | null
          cost_price: number | null
          created_at: string
          discount_pct: number | null
          gst_rate: number
          hsn_code: string | null
          id: string
          igst: number | null
          invoice_id: string
          name: string
          product_id: string | null
          quantity: number
          rate: number
          sgst: number | null
          taxable_amount: number
          total: number
          unit: string | null
        }
        Insert: {
          cgst?: number | null
          cost_price?: number | null
          created_at?: string
          discount_pct?: number | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number | null
          invoice_id: string
          name: string
          product_id?: string | null
          quantity?: number
          rate?: number
          sgst?: number | null
          taxable_amount?: number
          total?: number
          unit?: string | null
        }
        Update: {
          cgst?: number | null
          cost_price?: number | null
          created_at?: string
          discount_pct?: number | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number | null
          invoice_id?: string
          name?: string
          product_id?: string | null
          quantity?: number
          rate?: number
          sgst?: number | null
          taxable_amount?: number
          total?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          cgst: number
          company_id: string
          created_at: string
          discount: number
          due_date: string | null
          gr_rr_no: string | null
          id: string
          igst: number
          invoice_date: string
          invoice_number: string
          invoice_time: string | null
          invoice_type: Database["public"]["Enums"]["invoice_doc_type"]
          is_interstate: boolean | null
          notes: string | null
          party_id: string | null
          place_of_supply: string | null
          reverse_charge: boolean
          sgst: number
          shipping_address: string | null
          station: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          terms: string | null
          total: number
          transport_name: string | null
          updated_at: string
          vehicle_no: string | null
        }
        Insert: {
          amount_paid?: number
          cgst?: number
          company_id: string
          created_at?: string
          discount?: number
          due_date?: string | null
          gr_rr_no?: string | null
          id?: string
          igst?: number
          invoice_date?: string
          invoice_number: string
          invoice_time?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_doc_type"]
          is_interstate?: boolean | null
          notes?: string | null
          party_id?: string | null
          place_of_supply?: string | null
          reverse_charge?: boolean
          sgst?: number
          shipping_address?: string | null
          station?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          terms?: string | null
          total?: number
          transport_name?: string | null
          updated_at?: string
          vehicle_no?: string | null
        }
        Update: {
          amount_paid?: number
          cgst?: number
          company_id?: string
          created_at?: string
          discount?: number
          due_date?: string | null
          gr_rr_no?: string | null
          id?: string
          igst?: number
          invoice_date?: string
          invoice_number?: string
          invoice_time?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_doc_type"]
          is_interstate?: boolean | null
          notes?: string | null
          party_id?: string | null
          place_of_supply?: string | null
          reverse_charge?: boolean
          sgst?: number
          shipping_address?: string | null
          station?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          terms?: string | null
          total?: number
          transport_name?: string | null
          updated_at?: string
          vehicle_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_groups: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_primary: boolean
          is_system: boolean
          name: string
          nature: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          is_system?: boolean
          name: string
          nature: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          is_system?: boolean
          name?: string
          nature?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ledger_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ledgers: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          group_id: string
          gst_rate: number | null
          id: string
          is_system: boolean
          name: string
          notes: string | null
          opening_balance: number
          opening_type: string
          party_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          group_id: string
          gst_rate?: number | null
          id?: string
          is_system?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          opening_type?: string
          party_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          group_id?: string
          gst_rate?: number | null
          id?: string
          is_system?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          opening_type?: string
          party_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledgers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledgers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ledger_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledgers_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          billing_address: string | null
          company_id: string
          created_at: string
          credit_limit: number | null
          email: string | null
          gstin: string | null
          id: string
          ledger_id: string | null
          name: string
          notes: string | null
          opening_balance: number | null
          phone: string | null
          shipping_address: string | null
          state: string | null
          state_code: string | null
          type: Database["public"]["Enums"]["party_type"]
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          company_id: string
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          gstin?: string | null
          id?: string
          ledger_id?: string | null
          name: string
          notes?: string | null
          opening_balance?: number | null
          phone?: string | null
          shipping_address?: string | null
          state?: string | null
          state_code?: string | null
          type?: Database["public"]["Enums"]["party_type"]
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          company_id?: string
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          gstin?: string | null
          id?: string
          ledger_id?: string | null
          name?: string
          notes?: string | null
          opening_balance?: number | null
          phone?: string | null
          shipping_address?: string | null
          state?: string | null
          state_code?: string | null
          type?: Database["public"]["Enums"]["party_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          direction: Database["public"]["Enums"]["payment_direction"]
          id: string
          invoice_id: string | null
          mode: string | null
          notes: string | null
          party_id: string | null
          payment_date: string
          purchase_id: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["payment_direction"]
          id?: string
          invoice_id?: string | null
          mode?: string | null
          notes?: string | null
          party_id?: string | null
          payment_date?: string
          purchase_id?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["payment_direction"]
          id?: string
          invoice_id?: string | null
          mode?: string | null
          notes?: string | null
          party_id?: string | null
          payment_date?: string
          purchase_id?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          phone: string
          purpose: string
        }
        Insert: {
          attempts?: number
          channel?: string
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          phone: string
          purpose?: string
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          phone?: string
          purpose?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_super: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_super?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_super?: boolean
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          gst_rate: number
          hsn_code: string | null
          id: string
          is_service: boolean | null
          low_stock_threshold: number | null
          name: string
          purchase_price: number | null
          sale_price: number
          sku: string | null
          stock_quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          is_service?: boolean | null
          low_stock_threshold?: number | null
          name: string
          purchase_price?: number | null
          sale_price?: number
          sku?: string | null
          stock_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          is_service?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          purchase_price?: number | null
          sale_price?: number
          sku?: string | null
          stock_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          phone_verified_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          phone_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          cgst: number | null
          created_at: string
          gst_rate: number
          hsn_code: string | null
          id: string
          igst: number | null
          name: string
          product_id: string | null
          purchase_id: string
          quantity: number
          rate: number
          sgst: number | null
          taxable_amount: number
          total: number
          unit: string | null
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number | null
          name: string
          product_id?: string | null
          purchase_id: string
          quantity?: number
          rate?: number
          sgst?: number | null
          taxable_amount?: number
          total?: number
          unit?: string | null
        }
        Update: {
          cgst?: number | null
          created_at?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number | null
          name?: string
          product_id?: string | null
          purchase_id?: string
          quantity?: number
          rate?: number
          sgst?: number | null
          taxable_amount?: number
          total?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: number
          bill_date: string
          bill_number: string
          cgst: number
          company_id: string
          created_at: string
          id: string
          igst: number
          is_interstate: boolean | null
          notes: string | null
          party_id: string | null
          sgst: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          bill_date?: string
          bill_number: string
          cgst?: number
          company_id: string
          created_at?: string
          id?: string
          igst?: number
          is_interstate?: boolean | null
          notes?: string | null
          party_id?: string | null
          sgst?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          bill_date?: string
          bill_number?: string
          cgst?: number
          company_id?: string
          created_at?: string
          id?: string
          igst?: number
          is_interstate?: boolean | null
          notes?: string | null
          party_id?: string | null
          sgst?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_lines: {
        Row: {
          created_at: string
          credit: number
          debit: number
          id: string
          ledger_id: string
          line_no: number
          narration: string | null
          voucher_id: string
        }
        Insert: {
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          ledger_id: string
          line_no?: number
          narration?: string | null
          voucher_id: string
        }
        Update: {
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          ledger_id?: string
          line_no?: number
          narration?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_lines_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_lines_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_auto: boolean
          narration: string | null
          source_id: string | null
          source_type: string | null
          total_credit: number
          total_debit: number
          updated_at: string
          voucher_date: string
          voucher_no: string | null
          voucher_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_auto?: boolean
          narration?: string | null
          source_id?: string | null
          source_type?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
          voucher_date?: string
          voucher_no?: string | null
          voucher_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_auto?: boolean
          narration?: string | null
          source_id?: string | null
          source_type?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
          voucher_date?: string
          voucher_no?: string | null
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_books: { Args: { _company_id: string }; Returns: boolean }
      company_role_of: {
        Args: { _company_id: string }
        Returns: Database["public"]["Enums"]["company_role"]
      }
      email_registered: {
        Args: { _email: string }
        Returns: {
          confirmed: boolean
          exists_flag: boolean
        }[]
      }
      ensure_party_ledger: { Args: { _party_id: string }; Returns: string }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      is_company_owner: { Args: { _company_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      normalize_phone: { Args: { _raw: string }; Returns: string }
      seed_default_coa: { Args: { _company_id: string }; Returns: undefined }
    }
    Enums: {
      company_role: "owner" | "accountant" | "staff"
      invoice_doc_type: "tax_invoice" | "bill_of_supply"
      invoice_status: "draft" | "unpaid" | "partial" | "paid" | "cancelled"
      party_type: "customer" | "supplier" | "both"
      payment_direction: "received" | "paid"
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
      company_role: ["owner", "accountant", "staff"],
      invoice_doc_type: ["tax_invoice", "bill_of_supply"],
      invoice_status: ["draft", "unpaid", "partial", "paid", "cancelled"],
      party_type: ["customer", "supplier", "both"],
      payment_direction: ["received", "paid"],
    },
  },
} as const
