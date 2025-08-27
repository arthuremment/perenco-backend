-- Script de création de la base de données pour le système de rapports journaliers
-- Ce script recrée la structure complète de la base de données

-- Création de la base de données (à exécuter séparément si nécessaire)
-- CREATE DATABASE daily_reports_db;

-- Connexion à la base de données
-- \c daily_reports_db;

-- Création des extensions si nécessaire
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configuration des paramètres
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Création du schéma public s'il n'existe pas
CREATE SCHEMA IF NOT EXISTS public;
COMMENT ON SCHEMA public IS 'standard public schema';

-- Attribution des droits sur le schéma
ALTER SCHEMA public OWNER TO postgres;

--
-- Fonction pour mettre à jour automatiquement le champ updated_at
--
CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Table: ships (navires)
--
CREATE TABLE public.ships (
    id integer NOT NULL,
    name text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'ship'::text NOT NULL,
    type text,
    status boolean,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    captain text,
    username text NOT NULL,
    last_login timestamp with time zone,
    "position" text,
    small_name text,
    crew integer
);

ALTER TABLE public.ships OWNER TO postgres;

-- Séquence pour l'auto-incrémentation des IDs
CREATE SEQUENCE public.ships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.ships_id_seq OWNER TO postgres;
ALTER SEQUENCE public.ships_id_seq OWNED BY public.ships.id;

--
-- Table: users (utilisateurs administrateurs/superviseurs)
--
CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'supervisor'::text])))
);

ALTER TABLE public.users OWNER TO postgres;

-- Séquence pour l'auto-incrémentation des IDs
CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.users_id_seq OWNER TO postgres;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

--
-- Table: daily_reports (rapports journaliers)
--
CREATE TABLE public.daily_reports (
    id integer NOT NULL,
    ship_id integer NOT NULL,
    report_date date NOT NULL,
    notes text,
    update_at timestamp without time zone DEFAULT now(),
    crew integer,
    visitors integer,
    pob integer,
    sailing_eco numeric(5,2),
    sailing_full numeric(5,2),
    cargo_ops numeric(5,2),
    lifting_ops numeric(5,2),
    standby_offshore numeric(5,2),
    standby_port numeric(5,2),
    standby_anchorage numeric(5,2),
    downtime numeric(5,2),
    distance numeric(10,2),
    operations json,
    tanks json,
    silos json,
    fuel_transfers json,
    fuel_oil_rob numeric(10,2),
    fuel_oil_received numeric(10,2),
    fuel_oil_consumed numeric(10,2),
    fuel_oil_delivered numeric(10,2),
    lub_oil_rob numeric(10,2),
    lub_oil_received numeric(10,2),
    lub_oil_consumed numeric(10,2),
    lub_oil_delivered numeric(10,2),
    fresh_water_rob numeric(10,2),
    fresh_water_received numeric(10,2),
    fresh_water_consumed numeric(10,2),
    fresh_water_delivered numeric(10,2),
    remarks text,
    prepared_by character varying(50),
    vessel_name character varying(50)
);

ALTER TABLE public.daily_reports OWNER TO postgres;

-- Séquence pour l'auto-incrémentation des IDs
CREATE SEQUENCE public.daily_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.daily_reports_id_seq OWNER TO postgres;
ALTER SEQUENCE public.daily_reports_id_seq OWNED BY public.daily_reports.id;

--
-- Table: fuel_transfers (transferts de carburant - structure alternative)
--
CREATE TABLE public.fuel_transfers (
    id integer NOT NULL,
    report_id integer,
    date date DEFAULT ('now'::text)::date,
    transfer_to character varying(100),
    to_m3 numeric(10,3),
    to_details text,
    transfer_from character varying(100),
    from_m3 numeric(10,3),
    from_details text
);

ALTER TABLE public.fuel_transfers OWNER TO postgres;

-- Séquence pour l'auto-incrémentation des IDs
CREATE SEQUENCE public.fuel_transfers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.fuel_transfers_id_seq OWNER TO postgres;
ALTER SEQUENCE public.fuel_transfers_id_seq OWNED BY public.fuel_transfers.id;

--
-- Définition des valeurs par défaut pour les colonnes ID
--
ALTER TABLE ONLY public.ships ALTER COLUMN id SET DEFAULT nextval('public.ships_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.daily_reports ALTER COLUMN id SET DEFAULT nextval('public.daily_reports_id_seq'::regclass);
ALTER TABLE ONLY public.fuel_transfers ALTER COLUMN id SET DEFAULT nextval('public.fuel_transfers_id_seq'::regclass);

--
-- Contraintes de clés primaires
--
ALTER TABLE ONLY public.ships
    ADD CONSTRAINT ships_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.fuel_transfers
    ADD CONSTRAINT fuel_transfers_pkey PRIMARY KEY (id);

--
-- Contraintes d'unicité
--
ALTER TABLE ONLY public.ships
    ADD CONSTRAINT ships_name_key UNIQUE (name);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Clés étrangères
--
ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_ship_id_fkey FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.fuel_transfers
    ADD CONSTRAINT fuel_transfers_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Déclencheurs (triggers) pour mettre à jour automatiquement les timestamps
--
CREATE TRIGGER trg_set_updated_at_ships 
    BEFORE UPDATE ON public.ships 
    FOR EACH ROW 
    EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_users 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE PROCEDURE public.set_updated_at();

--
-- Insertion des données de base
--

-- Insertion de l'utilisateur admin
INSERT INTO public.users (id, name, email, password, role, is_active, created_at, updated_at) 
VALUES (1, 'admin', 'admin@perenco.com', 'perenco', 'admin', true, NOW(), NOW());

-- Insertion des navires
INSERT INTO public.ships (id, name, password, role, type, status, created_at, updated_at, captain, username, "position", small_name, crew) 
VALUES 
(3, 'BOURBON LIBERTY 212', 'perenco', 'ship', 'TANKER', true, NOW(), NOW(), 'captain', 'bl212', 'à quai', 'BL 212', 14),
(4, 'SILI GWEN', 'perenco', 'ship', 'REMORQUEUR', true, NOW(), NOW(), 'Paul', 'sili', 'à quai', 'SL GWEN', 7);

-- Insertion des rapports journaliers
INSERT INTO public.daily_reports (id, ship_id, report_date, notes, update_at, crew, visitors, pob, sailing_eco, sailing_full, cargo_ops, lifting_ops, standby_offshore, standby_port, standby_anchorage, downtime, distance, operations, tanks, silos, fuel_transfers, fuel_oil_rob, fuel_oil_received, fuel_oil_consumed, fuel_oil_delivered, lub_oil_rob, lub_oil_received, lub_oil_consumed, lub_oil_delivered, fresh_water_rob, fresh_water_received, fresh_water_consumed, fresh_water_delivered, remarks, prepared_by, vessel_name) VALUES
(1, 3, '2025-08-13', NULL, '2025-08-20 11:18:46.647545', 10, 1, NULL, 10.00, 10.00, 4.00, NULL, 0.00, 0.00, 0.00, 0.00, 300.00, '[{"time_from":"00:00","time_to":"10:00","activity":"Lifting","location":"RDR","remarks":""},{"time_from":"10:00","time_to":"00:00","activity":"DC Ops","location":"Douala","remarks":""},{"time_from":"02:00","time_to":"03:00","activity":"","location":"","remarks":""},{"time_from":"03:00","time_to":"04:00","activity":"","location":"","remarks":""},{"time_from":"04:00","time_to":"05:00","activity":"","location":"","remarks":""},{"time_from":"05:00","time_to":"06:00","activity":"","location":"","remarks":""},{"time_from":"06:00","time_to":"07:00","activity":"","location":"","remarks":""},{"time_from":"07:00","time_to":"08:00","activity":"","location":"","remarks":""},{"time_from":"08:00","time_to":"09:00","activity":"","location":"","remarks":""},{"time_from":"09:00","time_to":"10:00","activity":"","location":"","remarks":""},{"time_from":"10:00","time_to":"11:00","activity":"","location":"","remarks":""},{"time_from":"11:00","time_to":"12:00","activity":"","location":"","remarks":""},{"time_from":"12:00","time_to":"13:00","activity":"","location":"","remarks":""},{"time_from":"13:00","time_to":"14:00","activity":"","location":"","remarks":""},{"time_from":"14:00","time_to":"15:00","activity":"","location":"","remarks":""},{"time_from":"15:00","time_to":"16:00","activity":"","location":"","remarks":""},{"time_from":"16:00","time_to":"17:00","activity":"","location":"","remarks":""},{"time_from":"17:00","time_to":"18:00","activity":"","location":"","remarks":""},{"time_from":"18:00","time_to":"19:00","activity":"","location":"","remarks":""},{"time_from":"19:00","time_to":"20:00","activity":"","location":"","remarks":""},{"time_from":"20:00","time_to":"21:00","activity":"","location":"","remarks":""},{"time_from":"21:00","time_to":"22:00","activity":"","location":"","remarks":""},{"time_from":"22:00","time_to":"23:00","activity":"","location":"","remarks":""},{"time_from":"23:00","time_to":"24:00","activity":"","location":"","remarks":""}]', '[{"tank":"1P","type":"MUD","fluid_type":"","sg":"","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-04-20","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"1S","type":"MUD","fluid_type":"","sg":"","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-01-20","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"2P","type":"BRINE","fluid_type":"","sg":"1.02","capacity":"73/81","quantity":35,"status":"Not empty","origin_site":"PERENCO","origin_well":"","dest_site":"SIRONA","dest_well":"","loading_date":"2025-08-13","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"2S","type":"BRINE","fluid_type":"","sg":"1.02","capacity":"73/81","quantity":40,"status":"Not empty","origin_site":"PERENCO","origin_well":"","dest_site":"SIRONA","dest_well":"","loading_date":"2025-08-13","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"3P","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-11-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"3S","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-02-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"4P","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-01-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"4S","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-02-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"}]', '[{"silo":"1S","type":"Cement","product":"CaCO3","sg":"","bulk_density":"","capacity":"38/42","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-03-20","cleaning_cert":"n/a","priority":"","comments":""},{"silo":"2P","type":"Barite","product":"Barite","sg":"","bulk_density":"","capacity":"38/42","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-12-20","cleaning_cert":"n/a","priority":"","comments":""},{"silo":"3S","type":"G Cement","product":"G Cement","sg":"","bulk_density":"","capacity":"28/31","quantity":0,"status":"Empty & clean","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-10-20","cleaning_cert":"n/a","priority":"","comments":""},{"silo":"4P","type":"G Cement","product":"G Cement","sg":"","bulk_density":"","capacity":"28/31","quantity":0,"status":"Empty & clean","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-11-20","cleaning_cert":"n/a","priority":"","comments":""}]', '[{"to":"SILI GWENN","to_m3":"2000","to_details":"","from":"MASSONGO","from_m3":"2000","from_details":"Stock"},{"to":"ALIENOR","to_m3":"100","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""}]', 13100.00, 2000.00, 4.20, 2100.00, 1500.00, 0.00, 15.00, 0.00, 122.00, 0.00, 4.00, NULL, NULL, NULL, 'BOURBON LIBERTY 212'),
(2, 3, '2025-08-14', NULL, '2025-08-20 11:35:50.91972', 10, 1, NULL, 10.00, 10.00, 4.00, NULL, 0.00, 0.00, 0.00, 0.00, 300.00, '[{"time_from":"00:00","time_to":"10:00","activity":"Lifting","location":"RDR","remarks":""},{"time_from":"10:00","time_to":"00:00","activity":"DC Ops","location":"Douala","remarks":""},{"time_from":"02:00","time_to":"03:00","activity":"","location":"","remarks":""},{"time_from":"03:00","time_to":"04:00","activity":"","location":"","remarks":""},{"time_from":"04:00","time_to":"05:00","activity":"","location":"","remarks":""},{"time_from":"05:00","time_to":"06:00","activity":"","location":"","remarks":""},{"time_from":"06:00","time_to":"07:00","activity":"","location":"","remarks":""},{"time_from":"07:00","time_to":"08:00","activity":"","location":"","remarks":""},{"time_from":"08:00","time_to":"09:00","activity":"","location":"","remarks":""},{"time_from":"09:00","time_to":"10:00","activity":"","location":"","remarks":""},{"time_from":"10:00","time_to":"11:00","activity":"","location":"","remarks":""},{"time_from":"11:00","time_to":"12:00","activity":"","location":"","remarks":""},{"time_from":"12:00","time_to":"13:00","activity":"","location":"","remarks":""},{"time_from":"13:00","time_to":"14:00","activity":"","location":"","remarks":""},{"time_from":"14:00","time_to":"15:00","activity":"","location":"","remarks":""},{"time_from":"15:00","time_to":"16:00","activity":"","location":"","remarks":""},{"time_from":"16:00","time_to":"17:00","activity":"","location":"","remarks":""},{"time_from":"17:00","time_to":"18:00","activity":"","location":"","remarks":""},{"time_from":"18:00","time_to":"19:00","activity":"","location":"","remarks":""},{"time_from":"19:00","time_to":"20:00","activity":"","location":"","remarks":""},{"time_from":"20:00","time_to":"21:00","activity":"","location":"","remarks":""},{"time_from":"21:00","time_to":"22:00","activity":"","location":"","remarks":""},{"time_from":"22:00","time_to":"23:00","activity":"","location":"","remarks":""},{"time_from":"23:00","time_to":"24:00","activity":"","location":"","remarks":""}]', '[{"tank":"1P","type":"MUD","fluid_type":"","sg":"","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-04-20","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"1S","type":"MUD","fluid_type":"","sg":"","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-01-20","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"2P","type":"BRINE","fluid_type":"","sg":"1.02","capacity":"73/81","quantity":35,"status":"Not empty","origin_site":"PERENCO","origin_well":"","dest_site":"SIRONA","dest_well":"","loading_date":"2025-08-13","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"2S","type":"BRINE","fluid_type":"","sg":"1.02","capacity":"73/81","quantity":40,"status":"Not empty","origin_site":"PERENCO","origin_well":"","dest_site":"SIRONA","dest_well":"","loading_date":"2025-08-13","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"3P","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-11-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"3S","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-02-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"4P","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-01-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"4S","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-02-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"}]', '[{"silo":"1S","type":"Cement","product":"CaCO3","sg":"","bulk_density":"","capacity":"38/42","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-03-20","cleaning_cert":"n/a","priority":"","comments":""},{"silo":"2P","type":"Barite","product":"Barite","sg":"","bulk_density":"","capacity":"38/42","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-12-20","cleaning_cert":"n/a","priority":"","comments":""},{"silo":"3S","type":"G Cement","product":"G Cement","sg":"","bulk_density":"","capacity":"28/31","quantity":0,"status":"Empty & clean","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-10-20","cleaning_cert":"n/a","priority":"","comments":""},{"silio":"4P","type":"G Cement","product":"G Cement","sg":"","bulk_density":"","capacity":"28/31","quantity":0,"status":"Empty & clean","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-11-20","cleaning_cert":"n/a","priority":"","comments":""}]', '[{"to":"SILI GWENN","to_m3":"2000","to_details":"","from":"MASSONGO","from_m3":"2000","from_details":"Stock"},{"to":"ALIENOR","to_m3":"100","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""}]', 13100.00, 2000.00, 4.20, 2100.00, 1500.00, 0.00, 15.00, 0.00, 122.00, 0.00, 4.00, NULL, NULL, NULL, 'BOURBON LIBERTY 212'),
(3, 3, '2025-08-15', NULL, '2025-08-20 11:38:42.650153', 10, 1, NULL, 10.00, 10.00, 4.00, 0.00, 0.00, 0.00, 0.00, 0.00, 300.00, '[{"time_from":"00:00","time_to":"10:00","activity":"Lifting","location":"RDR","remarks":""},{"time_from":"10:00","time_to":"00:00","activity":"DC Ops","location":"Douala","remarks":""},{"time_from":"02:00","time_to":"03:00","activity":"","location":"","remarks":""},{"time_from":"03:00","time_to":"04:00","activity":"","location":"","remarks":""},{"time_from":"04:00","time_to":"05:00","activity":"","location":"","remarks":""},{"time_from":"05:00","time_to":"06:00","activity":"","location":"","remarks":""},{"time_from":"06:00","time_to":"07:00","activity":"","location":"","remarks":""},{"time_from":"07:00","time_to":"08:00","activity":"","location":"","remarks":""},{"time_from":"08:00","time_to":"09:00","activity":"","location":"","remarks":""},{"time_from":"09:00","time_to":"10:00","activity":"","location":"","remarks":""},{"time_from":"10:00","time_to":"11:00","activity":"","location":"","remarks":""},{"time_from":"11:00","time_to":"12:00","activity":"","location":"","remarks":""},{"time_from":"12:00","time_to":"13:00","activity":"","location":"","remarks":""},{"time_from":"13:00","time_to":"14:00","activity":"","location":"","remarks":""},{"time_from":"14:00","time_to":"15:00","activity":"","location":"","remarks":""},{"time_from":"15:00","time_to":"16:00","activity":"","location":"","remarks":""},{"time_from":"16:00","time_to":"17:00","activity":"","location":"","remarks":""},{"time_from":"17:00","time_to":"18:00","activity":"","location":"","remarks":""},{"time_from":"18:00","time_to":"19:00","activity":"","location":"","remarks":""},{"time_from":"19:00","time_to":"20:00","activity":"","location":"","remarks":""},{"time_from":"20:00","time_to":"21:00","activity":"","location":"","remarks":""},{"time_from":"21:00","time_to":"22:00","activity":"","location":"","remarks":""},{"time_from":"22:00","time_to":"23:00","activity":"","location":"","remarks":""},{"time_from":"23:00","time_to":"24:00","activity":"","location":"","remarks":""}]', '[{"tank":"1P","type":"MUD","fluid_type":"","sg":"","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-04-20","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"1S","type":"MUD","fluid_type":"","sg":"","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-01-20","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"2P","type":"BRINE","fluid_type":"","sg":"1.02","capacity":"73/81","quantity":35,"status":"Not empty","origin_site":"PERENCO","origin_well":"","dest_site":"SIRONA","dest_well":"","loading_date":"2025-08-13","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"2S","type":"BRINE","fluid_type":"","sg":"1.02","capacity":"73/81","quantity":40,"status":"Not empty","origin_site":"PERENCO","origin_well":"","dest_site":"SIRONA","dest_well":"","loading_date":"2025-08-13","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"","cleaning_cert":"n/a","priority":"","comments":""},{"tank":"3P","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-11-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"3S","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-02-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"4P","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-01-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"},{"tank":"4S","type":"MUD","fluid_type":"NABM","sg":"1.48","capacity":"73/81","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-02-20","cleaning_cert":"n/a","priority":"","comments":"Previous Products: NABM 1.48"}]', '[{"silo":"1S","type":"Cement","product":"CaCO3","sg":"","bulk_density":"","capacity":"38/42","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2025-03-20","cleaning_cert":"n/a","priority":"","comments":""},{"silo":"2P","type":"Barite","product":"Barite","sg":"","bulk_density":"","capacity":"38/42","quantity":0,"status":"Residues","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-12-20","cleaning_cert":"n/a","priority":"","comments":""},{"silo":"3S","type":"G Cement","product":"G Cement","sg":"","bulk_density":"","capacity":"28/31","quantity":0,"status":"Empty & clean","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-10-20","cleaning_cert":"n/a","priority":"","comments":""},{"silo":"4P","type":"G Cement","product":"G Cement","sg":"","bulk_density":"","capacity":"28/31","quantity":0,"status":"Empty & clean","origin_site":"","origin_well":"","dest_site":"","dest_well":"","loading_date":"","offloading_date":"","offloading_to":"","bc_st_ref":"","last_cleaning":"2024-11-20","cleaning_cert":"n/a","priority":"","comments":""}]', '[{"to":"SILI GWENN","to_m3":"2000","to_details":"","from":"MASSONGO","from_m3":"2000","from_details":"Stock"},{"to":"ALIENOR","to_m3":"100","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""},{"to":"","to_m3":"","to_details":"","from":"","from_m3":"","from_details":""}]', 13100.00, 2000.00, 4.20, 2100.00, 1500.00, 0.00, 15.00, 0.00, 122.00, 0.00, 4.00, NULL, NULL, NULL, 'BOURBON LIBERTY 212');

-- Réinitialisation des séquences
SELECT pg_catalog.setval('public.ships_id_seq', 4, true);
SELECT pg_catalog.setval('public.users_id_seq', 1, true);
SELECT pg_catalog.setval('public.daily_reports_id_seq', 10, true);
SELECT pg_catalog.setval('public.fuel_transfers_id_seq', 1, false);

-- Attribution des droits (optionnel, selon la configuration de sécurité)
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

COMMENT ON SCHEMA public IS 'standard public schema';