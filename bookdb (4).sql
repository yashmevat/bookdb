-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 29, 2026 at 08:21 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bookdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `author_subjects`
--

CREATE TABLE `author_subjects` (
  `id` int(11) NOT NULL,
  `author_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `author_subjects`
--

INSERT INTO `author_subjects` (`id`, `author_id`, `subject_id`, `assigned_at`) VALUES
(9, 7, 8, '2026-01-29 06:12:12');

-- --------------------------------------------------------

--
-- Table structure for table `bookmarks`
--

CREATE TABLE `bookmarks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `page_index` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `books`
--

CREATE TABLE `books` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `author_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `books`
--

INSERT INTO `books` (`id`, `title`, `author_id`, `subject_id`, `created_at`) VALUES
(6, 'latest dental book', 7, 8, '2026-01-29 06:13:02');

-- --------------------------------------------------------

--
-- Table structure for table `chapters`
--

CREATE TABLE `chapters` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `author_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `order_num` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `highlights`
--

CREATE TABLE `highlights` (
  `id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `page_index` int(11) NOT NULL,
  `selected_text` text NOT NULL,
  `color` varchar(50) NOT NULL DEFAULT '#FFFF00',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pages`
--

CREATE TABLE `pages` (
  `id` int(11) NOT NULL,
  `subtopic_id` int(11) DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pages`
--

INSERT INTO `pages` (`id`, `subtopic_id`, `content`, `created_at`) VALUES
(377, 1, '<h2>Paragraphs &amp; Topic Sentences</h2><p>A paragraph is a series of sentences that are organized and coherent, and are all related to a single topic. Almost every piece of writing you do that is longer than a few sentences should be organized into paragraphs. This is because paragraphs show a reader where the subdivisions of an essay begin and end, and thus help the reader see the organization of the essay and grasp its main points.</p><p>Paragraphs can contain many different kinds of information. A paragraph could contain a series of brief examples or a single long illustration of a general point. It might describe a place, character, or process; narrate a series of events; compare or contrast two or more things; classify items into categories; or describe causes and effects. Regardless of the kind of information they contain, all paragraphs share certain characteristics. One of the most important of these is a topic sentence.</p><h3>TOPIC SENTENCES</h3><p>A well-organized paragraph supports or develops a single controlling idea, which is expressed in a sentence called the topic sentence. A topic sentence has several important functions: it substantiates or supports an essay’s thesis statement; it unifies the content of a paragraph and directs the order of the sentences; and it advises the reader of the subject to be discussed and how the paragraph will discuss it. Readers generally look to the first few sentences in a paragraph to determine the subject and perspective of the paragraph. That’s why it’s often best to put the topic sentence at the very beginning of the paragraph. In some cases, however, it’s more effective to place another sentence before the topic sentence—for example, a sentence linking the current paragraph to the previous one, or one providing background information.</p><p>Although most paragraphs should have a topic sentence, there are a few situations when a paragraph might not need a topic sentence. For example, you might be able to omit a topic sentence in a paragraph that narrates a series of events, if a paragraph continues developing an idea that you introduced (with a topic sentence) in the previous paragraph, or if all the sentences and details in a paragraph clearly refer—perhaps indirectly—to a main point. The vast majority of your paragraphs, however, should have a topic sentence.</p><h3>PARAGRAPH STRUCTURE</h3><p>Most paragraphs in an essay have a three-part structure—introduction, body, and conclusion. You can see this structure in paragraphs whether they are narrating, describing, comparing, contrasting, or analyzing information. Each part of the paragraph plays an important role in communicating your meaning to your reader.</p><p>Introduction: the first section of a paragraph; should include the topic sentence and any other sentences at the beginning of the paragraph that give background information or provide a transition.</p><p>Body: follows the introduction; discusses the controlling idea, using facts, arguments, analysis, examples, and other information.</p><p>Conclusion: the final section; summarizes the connections between the information discussed in the body of the paragraph and the paragraph’s controlling idea.</p>', '2026-01-29 06:58:05'),
(378, 1, '<p>The following paragraph illustrates this pattern of organization. In this paragraph the topic sentence and concluding sentence (CAPITALIZED) both help the reader keep the paragraph’s main point in mind.</p><blockquote>SCIENTISTS HAVE LEARNED TO SUPPLEMENT THE SENSE OF SIGHT IN NUMEROUS WAYS. In front of the tiny pupil of the eye&nbsp;they put, on Mount Palomar, a great monocle 200 inches in diameter, and with it see 2000 times farther into the depths of space.&nbsp;Or they look&nbsp;through a small pair of lenses arranged as a microscope into a drop of water or blood, and magnify by as much as 2000 diameters the living creatures there, many of which are among man’s most dangerous enemies.&nbsp;Or, if we want to see distant happenings on earth,&nbsp;they use&nbsp;some of the previously wasted electromagnetic waves to carry television images which they re-create as light by whipping tiny crystals on a screen with electrons in a vacuum.&nbsp;Or they can bring&nbsp;happenings of long ago and far away as colored motion pictures, by arranging silver atoms and color-absorbing molecules to force light waves into the patterns of original reality.&nbsp;Or&nbsp;if we want to see into the center of a steel casting or the chest of an injured child,&nbsp;they send&nbsp;the information on a beam of penetrating short-wave X rays, and then convert it back into images we can see on a screen or photograph. THUS ALMOST EVERY TYPE OF ELECTROMAGNETIC RADIATION YET DISCOVERED HAS BEEN USED TO EXTEND OUR SENSE OF SIGHT IN SOME WAY.</blockquote><blockquote><br></blockquote><blockquote>George Harrison, “Faith and the Scientist”</blockquote><h3>COHERENCE</h3><p>In a coherent paragraph, each sentence relates clearly to the topic sentence or controlling idea, but there is more to coherence than this. If a paragraph is coherent, each sentence flows smoothly into the next without obvious shifts or jumps. A coherent paragraph also highlights the ties between old information and new information to make the structure of ideas or arguments clear to the reader.</p><p>Along with the smooth flow of sentences, a paragraph’s coherence may also be related to its length. If you have written a very long paragraph, one that fills a double-spaced typed page, for example, you should check it carefully to see if it should start a new paragraph where the original paragraph wanders from its controlling idea. On the other hand, if a paragraph is very short (only one or two sentences, perhaps), you may need to develop its controlling idea more thoroughly, or combine it with another paragraph.</p><p>A number of other techniques that you can use to establish coherence in paragraphs are described below.</p><p>Repeat key words or phrases.&nbsp;Particularly in paragraphs in which you define or identify an important idea or theory, be consistent in how you refer to it. This consistency and repetition will bind the paragraph together and help your reader understand your definition or description.</p>', '2026-01-29 06:58:05'),
(379, 1, '<p>Create parallel structures.&nbsp;Parallel structures are created by constructing two or more phrases or sentences that have the same grammatical structure and use the same parts of speech. By creating parallel structures you make your sentences clearer and easier to read. In addition, repeating a pattern in a series of consecutive sentences helps your reader see the connections between ideas. In the paragraph above about scientists and the sense of sight, several sentences in the body of the paragraph have been constructed in a parallel way. The parallel structures (which have been&nbsp;emphasized) help the reader see that the paragraph is organized as a set of examples of a general statement.</p><p>Be consistent in point of view, verb tense, and number.&nbsp;Consistency in point of view, verb tense, and number is a subtle but important aspect of coherence. If you shift from the more personal \"you\" to the impersonal “one,” from past to present tense, or from “a man” to “they,” for example, you make your paragraph less coherent. Such inconsistencies can also confuse your reader and make your argument more difficult to follow.</p><p>Use transition words or phrases between sentences and between paragraphs.&nbsp;Transitional expressions emphasize the relationships between ideas, so they help readers follow your train of thought or see connections that they might otherwise miss or misunderstand. The following paragraph shows how carefully chosen transitions (CAPITALIZED) lead the reader smoothly from the introduction to the conclusion of the paragraph.</p><blockquote>I don’t wish to deny that the flattened, minuscule head of the large-bodied \"stegosaurus\" houses little brain from our subjective, top-heavy perspective, BUT I do wish to assert that we should not expect more of the beast. FIRST OF ALL, large animals have relatively smaller brains than related, small animals. The correlation of brain size with body size among kindred animals (all reptiles, all mammals, FOR EXAMPLE) is remarkably regular. AS we move from small to large animals, from mice to elephants or small lizards to Komodo dragons, brain size increases, BUT not so fast as body size. IN OTHER WORDS, bodies grow faster than brains, AND large animals have low ratios of brain weight to body weight. IN FACT, brains grow only about two-thirds as fast as bodies. SINCE we have no reason to believe that large animals are consistently stupider than their smaller relatives, we must conclude that large animals require relatively less brain to do as well as smaller animals. IF we do not recognize this relationship, we are likely to underestimate the mental power of very large animals, dinosaurs in particular.</blockquote><blockquote>Stephen Jay Gould, “Were Dinosaurs Dumb?”</blockquote><h3>SOME USEFUL TRANSITIONS</h3><p>(modified from Diana Hacker,</p><p>A Writer’s Reference</p><p>)</p><p>To show addition:</p><p>again, and, also, besides, equally important, first (second, etc.), further, furthermore, in addition, in the first place, moreover, next, too</p><p>To give examples:</p>', '2026-01-29 06:58:05'),
(380, 1, '<p>for example, for instance, in fact, specifically, that is, to illustrate</p><p>To compare:</p><p>also, in the same manner, likewise, similarly</p><p>To contrast:</p><p>although, and yet, at the same time, but, despite, even though, however, in contrast, in spite of, nevertheless, on the contrary, on the other hand, still, though, yet</p><p>To summarize or conclude:</p><p>all in all, in conclusion, in other words, in short, in summary, on the whole, that is, therefore, to sum up</p><p>To show time:</p><p>after, afterward, as, as long as, as soon as, at last, before, during, earlier, finally, formerly, immediately, later, meanwhile, next, since, shortly, subsequently, then, thereafter, until, when, while</p><p>To show place or direction:</p><p>above, below, beyond, close, elsewhere, farther on, here, nearby, opposite, to the left (north, etc.)</p><p>To indicate logical relationship:</p><p>accordingly, as a result, because, consequently, for this reason, hence, if, otherwise, since, so, then, therefore, thus</p><p><em>Produced by Writing Tutorial Services, Indiana University, Bloomington, IN</em></p>', '2026-01-29 06:58:05'),
(381, 2, '<h2>Paragraphs &amp; Topic Sentences</h2><p>A paragraph is a series of sentences that are organized and coherent, and are all related to a single topic. Almost every piece of writing you do that is longer than a few sentences should be organized into paragraphs. This is because paragraphs show a reader where the subdivisions of an essay begin and end, and thus help the reader see the organization of the essay and grasp its main points.</p><p>Paragraphs can contain many different kinds of information. A paragraph could contain a series of brief examples or a single long illustration of a general point. It might describe a place, character, or process; narrate a series of events; compare or contrast two or more things; classify items into categories; or describe causes and effects. Regardless of the kind of information they contain, all paragraphs share certain characteristics. One of the most important of these is a topic sentence.</p><h3>TOPIC SENTENCES</h3><p>A well-organized paragraph supports or develops a single controlling idea, which is expressed in a sentence called the topic sentence. A topic sentence has several important functions: it substantiates or supports an essay’s thesis statement; it unifies the content of a paragraph and directs the order of the sentences; and it advises the reader of the subject to be discussed and how the paragraph will discuss it. Readers generally look to the first few sentences in a paragraph to determine the subject and perspective of the paragraph. That’s why it’s often best to put the topic sentence at the very beginning of the paragraph. In some cases, however, it’s more effective to place another sentence before the topic sentence—for example, a sentence linking the current paragraph to the previous one, or one providing background information.</p><p>Although most paragraphs should have a topic sentence, there are a few situations when a paragraph might not need a topic sentence. For example, you might be able to omit a topic sentence in a paragraph that narrates a series of events, if a paragraph continues developing an idea that you introduced (with a topic sentence) in the previous paragraph, or if all the sentences and details in a paragraph clearly refer—perhaps indirectly—to a main point. The vast majority of your paragraphs, however, should have a topic sentence.</p><h3>PARAGRAPH STRUCTURE</h3><p>Most paragraphs in an essay have a three-part structure—introduction, body, and conclusion. You can see this structure in paragraphs whether they are narrating, describing, comparing, contrasting, or analyzing information. Each part of the paragraph plays an important role in communicating your meaning to your reader.</p><p>Introduction: the first section of a paragraph; should include the topic sentence and any other sentences at the beginning of the paragraph that give background information or provide a transition.</p><p>Body: follows the introduction; discusses the controlling idea, using facts, arguments, analysis, examples, and other information.</p><p>Conclusion: the final section; summarizes the connections between the information discussed in the body of the paragraph and the paragraph’s controlling idea.</p>', '2026-01-29 06:58:27'),
(382, 2, '<p>The following paragraph illustrates this pattern of organization. In this paragraph the topic sentence and concluding sentence (CAPITALIZED) both help the reader keep the paragraph’s main point in mind.</p><blockquote>SCIENTISTS HAVE LEARNED TO SUPPLEMENT THE SENSE OF SIGHT IN NUMEROUS WAYS. In front of the tiny pupil of the eye&nbsp;they put, on Mount Palomar, a great monocle 200 inches in diameter, and with it see 2000 times farther into the depths of space.&nbsp;Or they look&nbsp;through a small pair of lenses arranged as a microscope into a drop of water or blood, and magnify by as much as 2000 diameters the living creatures there, many of which are among man’s most dangerous enemies.&nbsp;Or, if we want to see distant happenings on earth,&nbsp;they use&nbsp;some of the previously wasted electromagnetic waves to carry television images which they re-create as light by whipping tiny crystals on a screen with electrons in a vacuum.&nbsp;Or they can bring&nbsp;happenings of long ago and far away as colored motion pictures, by arranging silver atoms and color-absorbing molecules to force light waves into the patterns of original reality.&nbsp;Or&nbsp;if we want to see into the center of a steel casting or the chest of an injured child,&nbsp;they send&nbsp;the information on a beam of penetrating short-wave X rays, and then convert it back into images we can see on a screen or photograph. THUS ALMOST EVERY TYPE OF ELECTROMAGNETIC RADIATION YET DISCOVERED HAS BEEN USED TO EXTEND OUR SENSE OF SIGHT IN SOME WAY.</blockquote><blockquote><br></blockquote><blockquote>George Harrison, “Faith and the Scientist”</blockquote><h3>COHERENCE</h3><p>In a coherent paragraph, each sentence relates clearly to the topic sentence or controlling idea, but there is more to coherence than this. If a paragraph is coherent, each sentence flows smoothly into the next without obvious shifts or jumps. A coherent paragraph also highlights the ties between old information and new information to make the structure of ideas or arguments clear to the reader.</p><p>Along with the smooth flow of sentences, a paragraph’s coherence may also be related to its length. If you have written a very long paragraph, one that fills a double-spaced typed page, for example, you should check it carefully to see if it should start a new paragraph where the original paragraph wanders from its controlling idea. On the other hand, if a paragraph is very short (only one or two sentences, perhaps), you may need to develop its controlling idea more thoroughly, or combine it with another paragraph.</p><p>A number of other techniques that you can use to establish coherence in paragraphs are described below.</p><p>Repeat key words or phrases.&nbsp;Particularly in paragraphs in which you define or identify an important idea or theory, be consistent in how you refer to it. This consistency and repetition will bind the paragraph together and help your reader understand your definition or description.</p>', '2026-01-29 06:58:27'),
(383, 2, '<p>Create parallel structures.&nbsp;Parallel structures are created by constructing two or more phrases or sentences that have the same grammatical structure and use the same parts of speech. By creating parallel structures you make your sentences clearer and easier to read. In addition, repeating a pattern in a series of consecutive sentences helps your reader see the connections between ideas. In the paragraph above about scientists and the sense of sight, several sentences in the body of the paragraph have been constructed in a parallel way. The parallel structures (which have been&nbsp;emphasized) help the reader see that the paragraph is organized as a set of examples of a general statement.</p><p>Be consistent in point of view, verb tense, and number.&nbsp;Consistency in point of view, verb tense, and number is a subtle but important aspect of coherence. If you shift from the more personal \"you\" to the impersonal “one,” from past to present tense, or from “a man” to “they,” for example, you make your paragraph less coherent. Such inconsistencies can also confuse your reader and make your argument more difficult to follow.</p><p>Use transition words or phrases between sentences and between paragraphs.&nbsp;Transitional expressions emphasize the relationships between ideas, so they help readers follow your train of thought or see connections that they might otherwise miss or misunderstand. The following paragraph shows how carefully chosen transitions (CAPITALIZED) lead the reader smoothly from the introduction to the conclusion of the paragraph.</p><blockquote>I don’t wish to deny that the flattened, minuscule head of the large-bodied \"stegosaurus\" houses little brain from our subjective, top-heavy perspective, BUT I do wish to assert that we should not expect more of the beast. FIRST OF ALL, large animals have relatively smaller brains than related, small animals. The correlation of brain size with body size among kindred animals (all reptiles, all mammals, FOR EXAMPLE) is remarkably regular. AS we move from small to large animals, from mice to elephants or small lizards to Komodo dragons, brain size increases, BUT not so fast as body size. IN OTHER WORDS, bodies grow faster than brains, AND large animals have low ratios of brain weight to body weight. IN FACT, brains grow only about two-thirds as fast as bodies. SINCE we have no reason to believe that large animals are consistently stupider than their smaller relatives, we must conclude that large animals require relatively less brain to do as well as smaller animals. IF we do not recognize this relationship, we are likely to underestimate the mental power of very large animals, dinosaurs in particular.</blockquote><blockquote>Stephen Jay Gould, “Were Dinosaurs Dumb?”</blockquote><h3>SOME USEFUL TRANSITIONS</h3><p>(modified from Diana Hacker,</p><p>A Writer’s Reference</p><p>)</p><p>To show addition:</p><p>again, and, also, besides, equally important, first (second, etc.), further, furthermore, in addition, in the first place, moreover, next, too</p><p>To give examples:</p>', '2026-01-29 06:58:27'),
(384, 2, '<p>for example, for instance, in fact, specifically, that is, to illustrate</p><p>To compare:</p><p>also, in the same manner, likewise, similarly</p><p>To contrast:</p><p>although, and yet, at the same time, but, despite, even though, however, in contrast, in spite of, nevertheless, on the contrary, on the other hand, still, though, yet</p><p>To summarize or conclude:</p><p>all in all, in conclusion, in other words, in short, in summary, on the whole, that is, therefore, to sum up</p><p>To show time:</p><p>after, afterward, as, as long as, as soon as, at last, before, during, earlier, finally, formerly, immediately, later, meanwhile, next, since, shortly, subsequently, then, thereafter, until, when, while</p><p>To show place or direction:</p><p>above, below, beyond, close, elsewhere, farther on, here, nearby, opposite, to the left (north, etc.)</p><p>To indicate logical relationship:</p><p>accordingly, as a result, because, consequently, for this reason, hence, if, otherwise, since, so, then, therefore, thus</p><p><em>Produced by Writing Tutorial Services, Indiana University, Bloomington, IN</em></p>', '2026-01-29 06:58:27');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role_name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'superadmin', 'Full system access with all privileges', '2026-01-24 10:00:15', '2026-01-24 10:00:15'),
(2, 'author', 'Can create, edit and manage content', '2026-01-24 10:00:15', '2026-01-24 10:00:15'),
(3, 'user', 'Basic user access with limited privileges', '2026-01-24 10:00:15', '2026-01-24 10:00:15');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `name`, `description`, `created_by`, `created_at`) VALUES
(8, 'dental', 'subject on dental', 3, '2026-01-29 06:11:56');

-- --------------------------------------------------------

--
-- Table structure for table `subtopics`
--

CREATE TABLE `subtopics` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `topic_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `author_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subtopics`
--

INSERT INTO `subtopics` (`id`, `name`, `description`, `topic_id`, `book_id`, `author_id`, `created_at`, `updated_at`) VALUES
(1, 'subtopic1', 'subtopic description', 8, 6, 7, '2026-01-29 06:28:30', '2026-01-29 06:28:30'),
(2, 'subtopic2', 'subtopic 2 description', 8, 6, 7, '2026-01-29 06:28:49', '2026-01-29 06:28:49');

-- --------------------------------------------------------

--
-- Table structure for table `topics`
--

CREATE TABLE `topics` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `book_id` int(11) DEFAULT NULL,
  `subject_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `topics`
--

INSERT INTO `topics` (`id`, `name`, `description`, `book_id`, `subject_id`, `created_at`) VALUES
(8, 'topic1', NULL, 6, 8, '2026-01-29 06:13:02'),
(9, 'topic2', NULL, 6, 8, '2026-01-29 06:13:02'),
(10, 'topic3', NULL, 6, 8, '2026-01-29 06:13:02');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role_id`, `created_at`) VALUES
(3, 'superadmin', 'admin@example.com', '$2b$10$QhPl6ZzEBEJeDibVgLI4gOJvIy8VNSKSJSM4Bx26DfBQAQ7OPRRV6', 1, '2026-01-20 06:43:12'),
(7, 'yash', 'yashmevat16@gmail.com', '$2b$10$KULieyNgo06WMdbpKi15HO/WfdD7AvyQ4UrPNvLh54vnlSeRFdqa2', 2, '2026-01-24 06:29:48'),
(9, 'yash mevat', 'yashmevat@gmail.com', '$2b$10$hWDPZtpMRwhznbGSDvXW8OVM90vex/h4.l246Ku6tFwgQkTkIAbHa', 2, '2026-01-24 10:28:31'),
(10, 'reader', 'reader@gmail.com', '$2b$10$EVtEULh8FqRPy4m8/zk37uL8M.TTczHtkcfVc2niuwRtruoAadYoG', 3, '2026-01-27 05:12:55');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `author_subjects`
--
ALTER TABLE `author_subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_author_subject` (`author_id`,`subject_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_book_page` (`user_id`,`book_id`,`page_index`),
  ADD KEY `idx_user_book` (`user_id`,`book_id`);

--
-- Indexes for table `books`
--
ALTER TABLE `books`
  ADD PRIMARY KEY (`id`),
  ADD KEY `author_id` (`author_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `chapters`
--
ALTER TABLE `chapters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_author` (`author_id`),
  ADD KEY `fk_chapters_book` (`book_id`);

--
-- Indexes for table `highlights`
--
ALTER TABLE `highlights`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_book_user` (`book_id`,`user_id`),
  ADD KEY `idx_page_index` (`page_index`);

--
-- Indexes for table `pages`
--
ALTER TABLE `pages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subtopic` (`subtopic_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `subtopics`
--
ALTER TABLE `subtopics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_topic` (`topic_id`),
  ADD KEY `idx_book` (`book_id`),
  ADD KEY `idx_author` (`author_id`),
  ADD KEY `idx_topic_book` (`topic_id`,`book_id`);

--
-- Indexes for table `topics`
--
ALTER TABLE `topics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_book` (`book_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `author_subjects`
--
ALTER TABLE `author_subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `bookmarks`
--
ALTER TABLE `bookmarks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `books`
--
ALTER TABLE `books`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `chapters`
--
ALTER TABLE `chapters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `highlights`
--
ALTER TABLE `highlights`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `pages`
--
ALTER TABLE `pages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=385;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `subtopics`
--
ALTER TABLE `subtopics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `topics`
--
ALTER TABLE `topics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `author_subjects`
--
ALTER TABLE `author_subjects`
  ADD CONSTRAINT `author_subjects_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `author_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `books`
--
ALTER TABLE `books`
  ADD CONSTRAINT `books_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `books_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`);

--
-- Constraints for table `chapters`
--
ALTER TABLE `chapters`
  ADD CONSTRAINT `chapters_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chapters_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `highlights`
--
ALTER TABLE `highlights`
  ADD CONSTRAINT `highlights_ibfk_1` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `highlights_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pages`
--
ALTER TABLE `pages`
  ADD CONSTRAINT `pages_ibfk_2` FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subtopics`
--
ALTER TABLE `subtopics`
  ADD CONSTRAINT `subtopics_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subtopics_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subtopics_ibfk_3` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `topics`
--
ALTER TABLE `topics`
  ADD CONSTRAINT `topics_ibfk_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
