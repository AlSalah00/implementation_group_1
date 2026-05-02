
CREATE DATABASE IF NOT EXISTS credential_registry
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE credential_registry;


CREATE TABLE IF NOT EXISTS institutions (
  id             INT          NOT NULL AUTO_INCREMENT,
  name           VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42)  NOT NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- 'pending' | 'authorized'
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_institutions_wallet (wallet_address)
);


CREATE TABLE IF NOT EXISTS students (
  id             INT          NOT NULL AUTO_INCREMENT,
  name           VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42)  NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_students_wallet (wallet_address)
);


CREATE TABLE IF NOT EXISTS credentials (
  id                 INT          NOT NULL AUTO_INCREMENT,
  credential_id      VARCHAR(100) NOT NULL,             -- UUID, matches on-chain ID
  institution_id     INT          NOT NULL,
  student_id         INT          NOT NULL,
  certificate_name   VARCHAR(255) NOT NULL,
  issued_date        DATE         NOT NULL,
  status             VARCHAR(20)  NOT NULL DEFAULT 'active',  -- 'active' | 'revoked'
  data_hash          VARCHAR(66)           DEFAULT NULL,  -- keccak256 hex string (0x + 64 chars)
  revocation_reason  VARCHAR(500)          DEFAULT NULL,
  tx_hash            VARCHAR(66)           DEFAULT NULL,  -- Ethereum tx hash (0x + 64 chars)
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_credentials_credential_id (credential_id),
  CONSTRAINT fk_credentials_institution FOREIGN KEY (institution_id) REFERENCES institutions (id),
  CONSTRAINT fk_credentials_student     FOREIGN KEY (student_id)     REFERENCES students (id)
);