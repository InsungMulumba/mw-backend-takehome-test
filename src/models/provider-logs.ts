import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class ProviderLog {
  @PrimaryGeneratedColumn("uuid")
  id: number;

  @Column()
  vrm: string;

  @Column()
  providerName: string;

  @Column('integer')
  duration: number;

  @Column()
  url: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column('integer')
  statusCode: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;
}
